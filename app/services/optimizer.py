import os
import shutil
import subprocess

import pulp

from app.models.player import Position

POSITION_REQUIREMENTS = {
    Position.GKP: 2,
    Position.DEF: 5,
    Position.MID: 5,
    Position.FWD: 3,
}

MAX_PER_TEAM = 3


class InfeasibleBudgetError(Exception):
    pass


def _resolve_cbc_path() -> str:
    try:
        prefix = subprocess.check_output(
            ["brew", "--prefix", "cbc"], stderr=subprocess.DEVNULL
        ).decode().strip()
        candidate = f"{prefix}/bin/cbc"
        if os.path.exists(candidate):
            return candidate
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass

    for candidate in ("/usr/bin/cbc", "/usr/local/bin/cbc"):
        if os.path.exists(candidate):
            return candidate

    return shutil.which("cbc") or "cbc"


_CBC_PATH = _resolve_cbc_path()


def optimize_freehit_squad(scored_players, budget: float = 100.0):
    """
    Free Hit LP: maximise XI score only, bench is cheap filler.

    Two binary variables per player (xi / bench). Bench cost doesn't enter the
    objective so the solver naturally picks the cheapest legal bench players,
    freeing maximum budget for the starting eleven.
    """
    prob = pulp.LpProblem("fpl_freehit_squad", pulp.LpMaximize)

    xi    = {p.id: pulp.LpVariable(f"xi_{p.id}",    cat="Binary") for p, _, _ in scored_players}
    bench = {p.id: pulp.LpVariable(f"bench_{p.id}", cat="Binary") for p, _, _ in scored_players}

    # Maximise XI score; tiny bench-cost penalty to break ties toward cheaper bench
    prob += (
        pulp.lpSum(sc * xi[p.id] for p, _, sc in scored_players)
        - pulp.lpSum(0.001 * float(s.price) * bench[p.id] for p, s, _ in scored_players)
    )

    # Budget covers the whole squad
    prob += pulp.lpSum(
        float(s.price) * (xi[p.id] + bench[p.id]) for p, s, _ in scored_players
    ) <= budget

    # A player can appear at most once
    for p, _, _ in scored_players:
        prob += xi[p.id] + bench[p.id] <= 1

    # Squad totals
    prob += pulp.lpSum(xi.values())    == 11
    prob += pulp.lpSum(bench.values()) == 4

    # Position totals across full squad
    for position, required in POSITION_REQUIREMENTS.items():
        prob += pulp.lpSum(
            xi[p.id] + bench[p.id]
            for p, _, _ in scored_players if p.position == position
        ) == required

    # Exactly 1 GK in XI, 1 on bench
    prob += pulp.lpSum(xi[p.id]    for p, _, _ in scored_players if p.position == Position.GKP) == 1
    prob += pulp.lpSum(bench[p.id] for p, _, _ in scored_players if p.position == Position.GKP) == 1

    # Valid formation for XI outfield
    prob += pulp.lpSum(xi[p.id] for p, _, _ in scored_players if p.position == Position.DEF) >= 3
    prob += pulp.lpSum(xi[p.id] for p, _, _ in scored_players if p.position == Position.MID) >= 2
    prob += pulp.lpSum(xi[p.id] for p, _, _ in scored_players if p.position == Position.FWD) >= 1

    # Max 3 per team across the whole squad
    for team_id in {p.team_id for p, _, _ in scored_players}:
        prob += pulp.lpSum(
            xi[p.id] + bench[p.id]
            for p, _, _ in scored_players if p.team_id == team_id
        ) <= MAX_PER_TEAM

    prob.solve(pulp.COIN_CMD(msg=0, path=_CBC_PATH))

    if prob.status != 1:
        raise InfeasibleBudgetError(
            f"No legal Free Hit squad exists for budget £{budget}m (solver status: {prob.status})"
        )

    return [
        (p, s, sc) for p, s, sc in scored_players
        if xi[p.id].value() == 1 or bench[p.id].value() == 1
    ]


def optimize_squad(scored_players, budget: float = 100.0):
    prob = pulp.LpProblem("fpl_squad_selection", pulp.LpMaximize)

    player_vars = {
        player.id: prob.add_variable(f"player_{player.id}", cat="Binary")
        for player, stats, score in scored_players
    }

    prob += pulp.lpSum(
        score * player_vars[player.id] for player, stats, score in scored_players
    )

    prob += (
        pulp.lpSum(
            float(stats.price) * player_vars[player.id]
            for player, stats, score in scored_players
        )
        <= budget
    )

    for position, required_count in POSITION_REQUIREMENTS.items():
        prob += (
            pulp.lpSum(
                player_vars[player.id]
                for player, stats, score in scored_players
                if player.position == position
            )
            == required_count
        )

    teams = {player.team_id for player, stats, score in scored_players}
    for team_id in teams:
        prob += (
            pulp.lpSum(
                player_vars[player.id]
                for player, stats, score in scored_players
                if player.team_id == team_id
            )
            <= MAX_PER_TEAM
        )

    prob.solve(pulp.COIN_CMD(msg=0, path=_CBC_PATH))

    if prob.status != 1:
        raise InfeasibleBudgetError(
            f"No legal 15-player squad exists for budget £{budget}m (solver status: {prob.status})"
        )

    selected_ids = {
        player.id
        for player, stats, score in scored_players
        if player_vars[player.id].value() == 1
    }

    return [
        (player, stats, score)
        for player, stats, score in scored_players
        if player.id in selected_ids
    ]
