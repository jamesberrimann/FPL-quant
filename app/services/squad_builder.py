import math

from app.core.db import async_session_factory
from app.ingestion.fpl_client import get_bootstrap_static
from app.models.player import Position
from app.services.player_pool import (
    get_latest_stats,
    filter_unavailable_players,
    filter_by_minimum_minutes,
)
from app.services.prediction import predict_points
from app.services.optimizer import optimize_squad
from app.services.fixtures import get_planning_gameweek, get_fixture_counts_in_gameweek_window

_SQUAD_WINDOW_GAMEWEEKS = 5
_EXPECTED_FIXTURES_PER_WINDOW = _SQUAD_WINDOW_GAMEWEEKS  # baseline: 1 game/GW

# Softmax temperature for captain probability (in predicted-points units).
# At T=1.5: a player ~20% above their peers captures ~55-60% of expected
# captaincy. Reflects how top managers heavily concentrate captaincy on the
# single best asset rather than spreading it across the position.
_CAPTAIN_SOFTMAX_T = 1.5


_CAPTAIN_POOL_SIZE = 15  # only realistic captaincy candidates compete for the premium


def _compute_captain_premiums(scored: list) -> dict[int, float]:
    """
    Returns {player_id: captain_probability} via softmax over the top MID/FWD
    scores. Restricting to the top N candidates prevents budget players from
    diluting the premium that should concentrate on elite assets like Haaland.
    """
    attacking = sorted(
        [
            (player.id, sc)
            for player, _, sc in scored
            if player.position in (Position.MID, Position.FWD) and sc > 0
        ],
        key=lambda x: x[1],
        reverse=True,
    )[:_CAPTAIN_POOL_SIZE]
    if not attacking:
        return {}
    ids, scores = zip(*attacking)
    max_sc = max(scores)
    exps = [math.exp((sc - max_sc) / _CAPTAIN_SOFTMAX_T) for sc in scores]
    total = sum(exps)
    return {pid: e / total for pid, e in zip(ids, exps)}


async def build_optimal_squad(budget: float = 100.0):
    async with async_session_factory() as db:
        data = await get_bootstrap_static()
        gameweek = next(e["id"] for e in data["events"] if e["is_current"])
        planning_gameweek = await get_planning_gameweek(db, gameweek)

        rows = await get_latest_stats(db, gameweek)
        rows = filter_unavailable_players(rows)
        rows = filter_by_minimum_minutes(rows)

        team_ids = {player.team_id for player, _ in rows}
        fixture_counts = await get_fixture_counts_in_gameweek_window(
            db, team_ids, planning_gameweek, num_gameweeks=_SQUAD_WINDOW_GAMEWEEKS
        )

        # 5-GW window: squad is held for months, not just next week.
        # fix_mult_floor=0.7: hard fixtures shouldn't write off a premium player.
        # recent_gw_weight=0.1: one hot/cold game is noise over a 5-GW horizon;
        # season xStats are a much better signal than last week's performance.
        scored = await predict_points(
            rows, db, gameweek=gameweek,
            fixture_from_gameweek=planning_gameweek, num_fixtures=5,
            fix_mult_floor=0.7, recent_gw_weight=0.1,
        )

        # Scale predicted score by fixture count over the window so DGW teams
        # (who play more games) are valued fairly over BGW teams.
        # Apply captaincy premium: expected extra multiplier from being captained.
        # Computed via softmax so the premium concentrates on the highest-scoring
        # asset (as top managers actually captain) rather than spreading flat
        # across all FWDs/MIDs.
        captain_premiums = _compute_captain_premiums(scored)
        scored = [
            (
                player, stats,
                sc
                * fixture_counts.get(player.team_id, _EXPECTED_FIXTURES_PER_WINDOW)
                / _EXPECTED_FIXTURES_PER_WINDOW
                * (1.0 + captain_premiums.get(player.id, 0.0)),
            )
            for player, stats, sc in scored
        ]

        squad = optimize_squad(scored, budget=budget)

        return squad


async def get_budget_sensitivity(
    base_budget: float = 100.0,
    step: float = 0.5,
    num_steps: int = 4,
) -> list[dict]:
    """
    Returns a list of {budget, squad_score, total_cost, marginal_gain} entries
    for `base_budget`, `base_budget + step`, ..., `base_budget + step*(num_steps-1)`.

    The same scored player pool is reused across all budget levels to keep the
    result internally consistent (only the budget constraint changes, not the
    underlying predictions).

    `marginal_gain` is the improvement in average squad score vs. the previous
    step, expressed as pts/GW gained per £0.5m extra.  None for the first step.
    """
    from app.services.optimizer import InfeasibleBudgetError

    async with async_session_factory() as db:
        data = await get_bootstrap_static()
        gameweek = next(e["id"] for e in data["events"] if e["is_current"])
        planning_gameweek = await get_planning_gameweek(db, gameweek)

        rows = await get_latest_stats(db, gameweek)
        rows = filter_unavailable_players(rows)
        rows = filter_by_minimum_minutes(rows)

        team_ids = {player.team_id for player, _ in rows}
        fixture_counts = await get_fixture_counts_in_gameweek_window(
            db, team_ids, planning_gameweek, num_gameweeks=_SQUAD_WINDOW_GAMEWEEKS
        )
        scored = await predict_points(
            rows, db, gameweek=gameweek,
            fixture_from_gameweek=planning_gameweek, num_fixtures=5,
            fix_mult_floor=0.7, recent_gw_weight=0.1,
        )
        captain_premiums = _compute_captain_premiums(scored)
        scored = [
            (
                player, stats,
                sc
                * fixture_counts.get(player.team_id, _EXPECTED_FIXTURES_PER_WINDOW)
                / _EXPECTED_FIXTURES_PER_WINDOW
                * (1.0 + captain_premiums.get(player.id, 0.0)),
            )
            for player, stats, sc in scored
        ]

    results = []
    prev_score = None
    for i in range(num_steps):
        budget = round(base_budget + i * step, 1)
        try:
            squad = optimize_squad(scored, budget=budget)
        except InfeasibleBudgetError:
            break
        avg_score = round(sum(sc for _, _, sc in squad) / len(squad), 3) if squad else 0.0
        total_cost = round(sum(float(s.price) for _, s, _ in squad), 1)
        marginal = round(avg_score - prev_score, 3) if prev_score is not None else None
        results.append({
            "budget": budget,
            "squad_score": avg_score,
            "total_cost": total_cost,
            "marginal_gain": marginal,
        })
        prev_score = avg_score

    return results
