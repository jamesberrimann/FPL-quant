from sqlalchemy.ext.asyncio import AsyncSession

from app.services.fixtures import get_all_gameweek_fixture_info_in_range, get_all_gameweek_multipliers_in_range

# Scan the full remaining season, not just a short lookahead window.
# DGW windows for your best players can be 20+ GWs away — the whole point.
_MAX_SEASON_GW = 38

_BB_DGW_THRESHOLD = 3
_FH_BLANK_THRESHOLD = 5


_RANK_SLIDE_THRESHOLD = 200_000
_BELOW_AVG_STREAK_THRESHOLD = 2


async def get_chip_windows(
    db: AsyncSession,
    squad_players: list[dict],
    current_gameweek: int,
    performance_context: dict | None = None,
) -> dict:
    """Scan all remaining gameweeks and return optimal chip timing for the season.

    squad_players: list of dicts with keys:
        team_id (int), position (Position), score (float), web_name (str)
        — score is the player's current predicted-points score, used as a
          proxy for player quality when ranking TC candidates.

    Returns a dict with:
        triple_captain: {gameweek, reason, best_player_name, best_player_score, is_dgw, candidates[]}
        bench_boost:    {gameweek, reason, dgw_count, projected_squad_pts, dgw_player_names[]}
        free_hit:       list of {gameweek, blank_count, reason, squad_projected_pts}
        wildcard:       {gameweek, reason, wc_number}
    """
    if not squad_players:
        return {
            "triple_captain": None,
            "bench_boost": None,
            "free_hit": [],
            "wildcard": None,
        }

    team_ids = {p["team_id"] for p in squad_players}
    fixture_info_by_gw = await get_all_gameweek_fixture_info_in_range(
        db, team_ids, current_gameweek, _MAX_SEASON_GW
    )
    multipliers_by_gw = {
        gw: {tid: v["count"] for tid, v in teams.items()}
        for gw, teams in fixture_info_by_gw.items()
    }
    gw_range = range(current_gameweek, _MAX_SEASON_GW + 1)

    # ── Triple Captain: best future GW for your top player.
    # Primary sort: fixture count (DGW=2 beats single=1).
    # Tiebreak: lower difficulty wins (easier opponent).
    # The player score is used only to rank players, not GWs — it already
    # has current-GW fixture ease baked in so we don't multiply by ease again.
    # Scan starts at current_gameweek + 1: TC is always a forward decision.
    top_scores = sorted(squad_players, key=lambda p: p.get("score", 0), reverse=True)

    # For each of the top 5 players find their personal best GW (DGW > single; easier > harder).
    # Then rank players by (is_dgw, player_score, fixture_ease) so the highest-scoring
    # player wins when fixture count is equal — player score is what TC multiplies.
    player_best: dict[str, dict] = {}
    for gw in range(current_gameweek + 1, _MAX_SEASON_GW + 1):
        for p in top_scores[:5]:
            info = fixture_info_by_gw[gw].get(p["team_id"], {"count": 0.0, "difficulty": 3.0})
            count = info["count"]
            if count == 0.0:
                continue
            name = p.get("web_name", "")
            existing = player_best.get(name)
            if existing is None or (count, -info["difficulty"]) > (existing["count"], -existing["difficulty"]):
                player_best[name] = {
                    "player": p,
                    "gw": gw,
                    "count": count,
                    "difficulty": info["difficulty"],
                }

    best_entry = max(
        player_best.values(),
        key=lambda x: (x["count"] >= 2.0, x["player"].get("score", 0), -x["difficulty"]),
        default=None,
    )
    best_tc_gw = best_entry["gw"] if best_entry else None
    best_tc_player = best_entry["player"] if best_entry else None

    triple_captain = None
    if best_tc_gw is not None and best_tc_player is not None:
        count = fixture_info_by_gw[best_tc_gw].get(best_tc_player["team_id"], {}).get("count", 0.0)
        is_dgw = count >= 2.0
        name = best_tc_player.get("web_name", "")

        # Build top 3 candidates: squad players from top_scores[:5] who have
        # a fixture in the recommended TC GW, ranked by player score.
        gw_mults = multipliers_by_gw[best_tc_gw]
        candidates = []
        for p in top_scores[:5]:
            p_count = gw_mults.get(p["team_id"], 0.0)
            if p_count > 0:
                candidates.append({
                    "player_name": p.get("web_name", ""),
                    "player_score": round(p.get("score", 0), 1),
                    "is_dgw": p_count >= 2.0,
                })
        candidates = candidates[:3]

        triple_captain = {
            "gameweek": best_tc_gw,
            "best_player_name": name,
            "best_player_score": round(best_tc_player.get("score", 0), 1),
            "is_dgw": is_dgw,
            "reason": (
                f"{name} has a DGW in GW{best_tc_gw} — triple the ceiling with two fixtures."
                if is_dgw else
                f"{name}'s best fixture of the season is in GW{best_tc_gw} — hold your chip for then."
            ),
            "candidates": candidates,
        }

    # ── Bench Boost: GW in the season with the most DGW players in the squad.
    # The bench contributes maximally when all 15 players play twice.
    best_bb_gw = None
    best_bb_dgw_count = -1

    for gw in gw_range:
        mults = multipliers_by_gw[gw]
        dgw_count = sum(1 for p in squad_players if mults.get(p["team_id"], 0.0) >= 2.0)
        if dgw_count > best_bb_dgw_count:
            best_bb_dgw_count = dgw_count
            best_bb_gw = gw

    bench_boost = None
    if best_bb_gw is not None and best_bb_dgw_count > 0:
        if best_bb_dgw_count >= _BB_DGW_THRESHOLD:
            reason = (
                f"GW{best_bb_gw} is your best Bench Boost window: "
                f"{best_bb_dgw_count} of your players have a double gameweek."
            )
        else:
            reason = (
                f"GW{best_bb_gw} has the most DGW players in your squad ({best_bb_dgw_count}) "
                f"but is below the ideal threshold ({_BB_DGW_THRESHOLD}) — consider waiting "
                "for a bigger DGW window or using it for a strong score week."
            )

        # Project total squad pts for the BB GW: score × fixture_count_multiplier.
        # DGW players contribute 2× their per-game score; BGW players contribute 0.
        bb_mults = multipliers_by_gw[best_bb_gw]
        projected_squad_pts = round(
            sum(p.get("score", 0) * bb_mults.get(p["team_id"], 0.0) for p in squad_players),
            1,
        )
        dgw_player_names = sorted(
            p.get("web_name", "") for p in squad_players
            if bb_mults.get(p["team_id"], 0.0) >= 2.0
        )

        bench_boost = {
            "gameweek": best_bb_gw,
            "dgw_count": best_bb_dgw_count,
            "reason": reason,
            "projected_squad_pts": projected_squad_pts,
            "dgw_player_names": dgw_player_names,
        }

    # ── Free Hit: GWs where many of your players blank.
    # Guard against unscheduled GWs (all zeros in DB) being misread as blanks.
    # Project current squad pts for each blank GW to show the cost of not using FH.
    free_hit_windows = []
    for gw in gw_range:
        mults = multipliers_by_gw[gw]
        has_any_fixture = any(mults.get(p["team_id"], 0.0) > 0 for p in squad_players)
        if not has_any_fixture:
            continue
        blank_count = sum(1 for p in squad_players if mults.get(p["team_id"], 0.0) == 0.0)
        if blank_count >= _FH_BLANK_THRESHOLD:
            # Current squad pts for this GW: blankers score 0, others score their per-game score.
            squad_projected_pts = round(
                sum(p.get("score", 0) * mults.get(p["team_id"], 1.0) for p in squad_players),
                1,
            )
            free_hit_windows.append({
                "gameweek": gw,
                "blank_count": blank_count,
                "reason": (
                    f"GW{gw}: {blank_count} of your players have a blank — "
                    "Free Hit would let you field a full DGW squad instead."
                ),
                "squad_projected_pts": squad_projected_pts,
            })

    # ── Wildcard: poor performance OR fixture difficulty cliff.
    avg_mults: dict[int, float] = {}
    for gw in gw_range:
        mults = multipliers_by_gw[gw]
        vals = [mults.get(p["team_id"], 0.0) for p in squad_players]
        avg_mults[gw] = sum(vals) / len(vals) if vals else 0.0

    wildcard = None
    performance_alert = None

    if performance_context:
        rank_slide = performance_context.get("rank_slide", 0)
        below_avg_streak = performance_context.get("below_avg_streak", 0)

        if rank_slide >= _RANK_SLIDE_THRESHOLD or below_avg_streak >= _BELOW_AVG_STREAK_THRESHOLD:
            wc_number = 1 if current_gameweek <= 20 else 2
            reasons = []
            if rank_slide >= _RANK_SLIDE_THRESHOLD:
                reasons.append(f"rank has dropped {rank_slide:,} places in recent weeks")
            if below_avg_streak >= _BELOW_AVG_STREAK_THRESHOLD:
                reasons.append(
                    f"scored below the FPL average in {below_avg_streak} of your last 3 gameweeks"
                )
            reason_str = " and ".join(reasons)
            performance_alert = (
                f"Your team is struggling — {reason_str}. "
                f"A Wildcard lets you rebuild completely with the best available players."
            )
            wildcard = {
                "gameweek": current_gameweek,
                "reason": (
                    f"Your team is struggling — {reason_str}. "
                    f"Wildcarding now lets you completely rebuild with the best players for the weeks ahead."
                ),
                "wc_number": wc_number,
                "urgent": True,
            }

    if wildcard is None:
        gw_list = list(gw_range)
        for i in range(len(gw_list) - 1):
            gw_now = gw_list[i]
            gw_next = gw_list[i + 1]
            if avg_mults[gw_now] > 0 and avg_mults[gw_next] < avg_mults[gw_now] * 0.75:
                wc_number = 1 if gw_now <= 20 else 2
                wildcard = {
                    "gameweek": gw_now,
                    "reason": (
                        f"Fixture difficulty rises sharply after GW{gw_now} for your squad. "
                        f"Wildcarding in GW{gw_now} lets you bring in players with better upcoming runs."
                    ),
                    "wc_number": wc_number,
                    "urgent": False,
                }
                break

    return {
        "triple_captain": triple_captain,
        "bench_boost": bench_boost,
        "free_hit": free_hit_windows,
        "wildcard": wildcard,
        "performance_alert": performance_alert,
    }
