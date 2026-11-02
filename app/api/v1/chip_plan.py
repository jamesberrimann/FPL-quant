import asyncio

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.core.db import async_session_factory
from app.ingestion.fpl_client import get_bootstrap_static, get_entry_picks, get_entry_details, get_entry_history, get_entry_transfers
from app.services.player_pool import get_latest_stats, filter_unavailable_players, filter_by_minimum_minutes
from app.services.prediction import predict_points
from app.services.fixtures import (
    get_planning_gameweek, get_gameweek_fixture_multipliers, get_next_fixture_labels,
)
from app.services.chip_planner import get_chip_windows
from app.services.optimizer import optimize_freehit_squad, InfeasibleBudgetError
from app.services.lineup import pick_best_starting_xi
from app.services.captaincy import score_for_captaincy, get_captain_recommendation
from app.schemas.chip_plan import (
    ChipPlanOut, ChipAvailability,
    TripleCaptainWindowOut, TCCandidate,
    BenchBoostWindowOut, FreeHitWindowOut, WildcardWindowOut,
    FHSquadOut, FHSquadPlayerOut, RecentGWScore,
)

router = APIRouter()


def _build_chip_availability(history_data: dict) -> ChipAvailability:
    # Chips played live in /entry/{id}/history/ under the top-level "chips" key,
    # not in /entry/{id}/ — fetching the wrong endpoint returns an empty list.
    chips = history_data.get("chips", [])
    played_names = {c["name"] for c in chips}
    wc_events = [c["event"] for c in chips if c["name"] == "wildcard"]
    return ChipAvailability(
        triple_captain="3xc" not in played_names,
        bench_boost="bboost" not in played_names,
        free_hit="freehit" not in played_names,
        wildcard1=not any(e <= 20 for e in wc_events),
        wildcard2=not any(e > 20 for e in wc_events),
    )


@router.get("/chip-plan", response_model=ChipPlanOut)
async def chip_plan_route(entry_id: int = Query(...)):
    try:
        data, history_data = await asyncio.gather(
            get_bootstrap_static(),
            get_entry_history(entry_id),
        )
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail="FPL entry not found")
        raise HTTPException(status_code=502, detail="FPL API unavailable")

    gameweek = next(e["id"] for e in data["events"] if e["is_current"])

    try:
        picks_data = await get_entry_picks(entry_id, gameweek)
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail="FPL entry not found")
        raise

    chips_available = _build_chip_availability(history_data)
    my_element_ids = {pick["element"] for pick in picks_data["picks"]}

    gw_history = sorted(history_data.get("current", []), key=lambda x: x["event"], reverse=True)
    events_by_id = {e["id"]: e for e in data.get("events", [])}

    # Last 5 GWs for the score strip.
    recent_scores = [
        RecentGWScore(
            gameweek=entry["event"],
            points=entry.get("points", 0),
            average=(events_by_id.get(entry["event"]) or {}).get("average_entry_score") or None,
        )
        for entry in gw_history[:5]
    ]
    recent_scores.reverse()

    # Build performance context: rank slide and below-average streak over last 3 GWs.
    # Only meaningful if both wildcards are already gone — skip performance logic then.
    performance_context = None
    wc_still_available = chips_available.wildcard1 or chips_available.wildcard2
    if wc_still_available:
        recent_gws = gw_history[:3]

        rank_slide = 0
        if len(recent_gws) >= 2:
            oldest_rank = recent_gws[-1].get("overall_rank") or 0
            newest_rank = recent_gws[0].get("overall_rank") or 0
            rank_slide = max(0, newest_rank - oldest_rank)

        below_avg_streak = sum(
            1 for gw_entry in recent_gws
            if (avg := (events_by_id.get(gw_entry["event"]) or {}).get("average_entry_score", 0)) > 0
            and gw_entry.get("points", 0) < avg
        )

        performance_context = {
            "rank_slide": rank_slide,
            "below_avg_streak": below_avg_streak,
        }

    async with async_session_factory() as db:
        planning_gw = await get_planning_gameweek(db, gameweek)

        # Between GWs, layer on any pending transfers so chip logic uses the updated squad.
        if planning_gw > gameweek:
            try:
                transfers = await get_entry_transfers(entry_id)
                for t in transfers:
                    if t.get("event") == planning_gw:
                        my_element_ids.discard(t["element_out"])
                        my_element_ids.add(t["element_in"])
            except Exception:
                pass
        rows = await get_latest_stats(db, gameweek)
        my_rows = [(p, s) for p, s in rows if p.id in my_element_ids]

        scored = await predict_points(
            my_rows, db, gameweek=gameweek,
            fixture_from_gameweek=planning_gw, num_fixtures=1,
        )

        squad_players = [
            {
                "team_id": p.team_id,
                "position": p.position,
                "web_name": p.web_name,
                "score": sc,
            }
            for p, s, sc in scored
        ]

        windows = await get_chip_windows(
            db, squad_players,
            current_gameweek=planning_gw,
            performance_context=performance_context,
        )

    tc = windows["triple_captain"]
    bb = windows["bench_boost"]
    fh = windows["free_hit"]
    wc = windows["wildcard"]

    return ChipPlanOut(
        triple_captain=TripleCaptainWindowOut(
            **{k: v for k, v in tc.items() if k != "candidates"},
            candidates=[TCCandidate(**c) for c in tc.get("candidates", [])],
        ) if tc else None,
        bench_boost=BenchBoostWindowOut(**bb) if bb else None,
        free_hit=[FreeHitWindowOut(**w) for w in fh],
        wildcard=WildcardWindowOut(**wc) if wc else None,
        chips_available=chips_available,
        performance_alert=windows.get("performance_alert"),
        recent_scores=recent_scores,
    )


@router.get("/fh-squad", response_model=FHSquadOut)
async def fh_squad_route(
    entry_id: int = Query(...),
    gameweek: int = Query(..., ge=1, le=38),
):
    """Build the optimal Free Hit squad for a specific gameweek.

    Uses the entry's actual budget (bank + squad value from last deadline).
    Scores are computed for gameweek only — blank players score 0, DGW players
    score 2× — so the optimizer naturally fills the squad with active players.
    """
    try:
        data, entry_data = await asyncio.gather(
            get_bootstrap_static(),
            get_entry_details(entry_id),
        )
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail="FPL entry not found")
        raise HTTPException(status_code=502, detail="FPL API unavailable")

    current_gw = next(e["id"] for e in data["events"] if e["is_current"])
    team_map = {t["id"]: t["short_name"] for t in data.get("teams", [])}

    # Budget = ITB + squad value at last deadline (tenths of £m → £m)
    bank = entry_data.get("last_deadline_bank", 0)
    value = entry_data.get("last_deadline_value", 1000)
    budget = round((bank + value) / 10.0, 1)

    async with async_session_factory() as db:
        rows = await get_latest_stats(db, current_gw)
        rows = filter_unavailable_players(rows)
        rows = filter_by_minimum_minutes(rows)

        team_ids = {p.team_id for p, _ in rows}
        gw_multipliers = await get_gameweek_fixture_multipliers(db, team_ids, gameweek)

        # Score every player for this specific GW.
        # fixture_count_multipliers bakes DGW (2×) and blank (0×) directly into scores
        # so the optimizer picks only players who have a game in this GW.
        scored = await predict_points(
            rows, db, gameweek=current_gw,
            fixture_from_gameweek=gameweek, num_fixtures=1,
            fixture_count_multipliers=gw_multipliers,
        )

        try:
            squad = optimize_freehit_squad(scored, budget=budget)
        except InfeasibleBudgetError as e:
            raise HTTPException(status_code=422, detail=str(e))

        squad_team_ids = {p.team_id for p, _, _ in squad}
        fixture_labels = await get_next_fixture_labels(db, squad_team_ids, gameweek)

        lineup = pick_best_starting_xi(squad)
        captain_scored = await score_for_captaincy(lineup["starting_xi"], db, gameweek)

    rec = get_captain_recommendation(captain_scored)
    captain_id = rec["top_pick"]["player"].id
    vice_captain_id = rec["second_pick"]["player"].id

    total_cost = round(sum(float(s.price) for _, s, _ in squad), 1)
    projected_gw_pts = round(sum(sc for _, _, sc in squad), 1)

    def to_fh_player(p, s, sc):
        return FHSquadPlayerOut(
            id=p.id,
            web_name=p.web_name,
            position=p.position.value,
            team_short_name=team_map.get(p.team_id, "UNK"),
            price=float(s.price),
            projected_pts=round(sc, 1),
            fixture_label=fixture_labels.get(p.team_id),
            status=s.status,
            chance_of_playing_next_round=s.chance_of_playing_next_round,
        )

    players = [
        to_fh_player(p, s, sc)
        for p, s, sc in sorted(squad, key=lambda x: (
            ["GKP", "DEF", "MID", "FWD"].index(x[0].position.value), -x[2]
        ))
    ]
    starting_xi = [to_fh_player(p, s, sc) for p, s, sc in lineup["starting_xi"]]
    bench_list = []
    if lineup["bench_gk"]:
        bench_list.append(to_fh_player(*lineup["bench_gk"]))
    bench_list += [to_fh_player(p, s, sc) for p, s, sc in lineup["bench_outfield"]]

    return FHSquadOut(
        players=players,
        starting_xi=starting_xi,
        bench=bench_list,
        captain_id=captain_id,
        vice_captain_id=vice_captain_id,
        total_cost=total_cost,
        projected_gw_pts=projected_gw_pts,
        budget=budget,
        gameweek=gameweek,
    )
