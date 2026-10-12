import asyncio

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.core.db import async_session_factory
from app.ingestion.fpl_client import get_bootstrap_static, get_entry_picks, get_entry_details, get_entry_history
from app.services.player_pool import get_latest_stats, filter_unavailable_players, filter_by_minimum_minutes
from app.services.prediction import predict_points
from app.services.fixtures import (
    get_planning_gameweek, get_gameweek_fixture_multipliers, get_next_fixture_labels,
)
from app.services.chip_planner import get_chip_windows
from app.services.optimizer import optimize_squad, InfeasibleBudgetError
from app.schemas.chip_plan import (
    ChipPlanOut, ChipAvailability,
    TripleCaptainWindowOut, TCCandidate,
    BenchBoostWindowOut, FreeHitWindowOut, WildcardWindowOut,
    FHSquadOut, FHSquadPlayerOut,
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

    async with async_session_factory() as db:
        planning_gw = await get_planning_gameweek(db, gameweek)
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

        windows = await get_chip_windows(db, squad_players, current_gameweek=planning_gw)

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
            squad = optimize_squad(scored, budget=budget)
        except InfeasibleBudgetError as e:
            raise HTTPException(status_code=422, detail=str(e))

        squad_team_ids = {p.team_id for p, _, _ in squad}
        fixture_labels = await get_next_fixture_labels(db, squad_team_ids, gameweek)

    total_cost = round(sum(float(s.price) for _, s, _ in squad), 1)
    projected_gw_pts = round(sum(sc for _, _, sc in squad), 1)

    players = [
        FHSquadPlayerOut(
            web_name=p.web_name,
            position=p.position.value,
            team_short_name=team_map.get(p.team_id, "UNK"),
            price=float(s.price),
            projected_pts=round(sc, 1),
            fixture_label=fixture_labels.get(p.team_id),
        )
        for p, s, sc in sorted(squad, key=lambda x: (
            ["GKP", "DEF", "MID", "FWD"].index(x[0].position.value), -x[2]
        ))
    ]

    return FHSquadOut(
        players=players,
        total_cost=total_cost,
        projected_gw_pts=projected_gw_pts,
        budget=budget,
        gameweek=gameweek,
    )
