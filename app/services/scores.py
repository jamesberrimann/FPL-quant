from app.ingestion.fpl_client import get_fixtures, get_bootstrap_static

POSITION_MAP = {1: "GKP", 2: "DEF", 3: "MID", 4: "FWD"}


async def _get_team_info_by_id() -> dict[int, dict]:
    data = await get_bootstrap_static()
    return {t["id"]: {"name": t["name"], "short_name": t["short_name"]} for t in data["teams"]}


async def get_latest_team_score(team_id: int, current_gameweek: int | None = None) -> dict | None:
    fixtures = await get_fixtures()

    team_fixtures = [
        f for f in fixtures
        if (f["team_h"] == team_id or f["team_a"] == team_id) and f["finished_provisional"]
    ]

    if not team_fixtures:
        return None

    latest = max(team_fixtures, key=lambda f: f["event"])

    is_home = latest["team_h"] == team_id
    opponent_id = latest["team_a"] if is_home else latest["team_h"]

    team_info = await _get_team_info_by_id()

    return {
        "team_id": team_id,
        "team_name": team_info[team_id]["name"],
        "team_short_name": team_info[team_id]["short_name"],
        "gameweek": latest["event"],
        "is_current_gameweek": current_gameweek is not None and latest["event"] == current_gameweek,
        "is_home": is_home,
        "team_score": latest["team_h_score"] if is_home else latest["team_a_score"],
        "opponent_id": opponent_id,
        "opponent_name": team_info[opponent_id]["name"],
        "opponent_short_name": team_info[opponent_id]["short_name"],
        "opponent_score": latest["team_a_score"] if is_home else latest["team_h_score"],
        "fully_confirmed": latest["finished"],
    }


async def get_player_live_events(player_id: int, team_id: int) -> dict:
    fixtures = await get_fixtures()

    team_fixtures = [
        f for f in fixtures
        if (f["team_h"] == team_id or f["team_a"] == team_id) and f["finished_provisional"]
    ]

    if not team_fixtures:
        return {}

    latest = max(team_fixtures, key=lambda f: f["event"])
    side = "h" if latest["team_h"] == team_id else "a"

    events = {}
    for stat_block in latest.get("stats", []):
        for entry in stat_block[side]:
            if entry["element"] == player_id:
                events[stat_block["identifier"]] = entry["value"]

    if not events:
        return {}

    return {"gameweek": latest["event"], "stats": events}


async def get_squad_scores(entry_id: int) -> list[dict]:
    from app.core.db import async_session_factory
    from app.ingestion.fpl_client import get_entry_picks

    async with async_session_factory() as db:
        data = await get_bootstrap_static()
        current_gameweek = next(e["id"] for e in data["events"] if e["is_current"])

        picks_data = await get_entry_picks(entry_id, current_gameweek)
        my_element_ids = {pick["element"] for pick in picks_data["picks"]}

        my_team_ids = {
            element["team"]
            for element in data["elements"]
            if element["id"] in my_element_ids
        }

    results = []
    for team_id in my_team_ids:
        score = await get_latest_team_score(team_id, current_gameweek=current_gameweek)
        if score is not None:
            results.append(score)

    return results


async def get_squad_gw_points(entry_id: int) -> dict:
    from app.ingestion.fpl_client import get_gameweek_live, get_entry_picks

    data = await get_bootstrap_static()
    events = data["events"]

    current_event = next((e for e in events if e["is_current"]), None)
    last_finished = max((e for e in events if e["finished"]), key=lambda e: e["id"], default=None)

    if current_event:
        gameweek = current_event["id"]
        is_live_gw = True
    elif last_finished:
        gameweek = last_finished["id"]
        is_live_gw = False
    else:
        return {"gameweek": 0, "is_live_gw": False, "players": []}

    picks_data = await get_entry_picks(entry_id, gameweek)
    picks = picks_data["picks"]

    live_data = await get_gameweek_live(gameweek)
    live_by_id = {p["id"]: p for p in live_data["elements"]}
    elements_by_id = {e["id"]: e for e in data["elements"]}

    players = []
    for pick in picks:
        player_id = pick["element"]
        element = elements_by_id.get(player_id, {})
        stats = live_by_id.get(player_id, {}).get("stats", {})

        minutes = stats.get("minutes", 0)
        players.append({
            "player_id": player_id,
            "web_name": element.get("web_name", str(player_id)),
            "points": stats.get("total_points", 0),
            "minutes": minutes,
            "has_played": minutes > 0,
            "is_captain": pick["is_captain"],
            "is_vice_captain": pick["is_vice_captain"],
            "multiplier": pick["multiplier"],
            "position_in_squad": pick["position"],
        })

    return {"gameweek": gameweek, "is_live_gw": is_live_gw, "players": players}


async def get_squad_live_events(entry_id: int) -> list[dict]:
    from app.core.db import async_session_factory
    from app.ingestion.fpl_client import get_entry_picks

    async with async_session_factory() as db:
        data = await get_bootstrap_static()
        current_gameweek = next(e["id"] for e in data["events"] if e["is_current"])

        picks_data = await get_entry_picks(entry_id, current_gameweek)
        my_element_ids = {pick["element"] for pick in picks_data["picks"]}

        elements_by_id = {e["id"]: e for e in data["elements"]}

    team_info = {t["id"]: t["short_name"] for t in data["teams"]}

    results = []
    for player_id in my_element_ids:
        element = elements_by_id[player_id]
        event_data = await get_player_live_events(player_id, element["team"])
        if event_data:
            results.append({
                "player_id": player_id,
                "web_name": element["web_name"],
                "position": POSITION_MAP.get(element["element_type"], "UNK"),
                "team_short_name": team_info.get(element["team"], "UNK"),
                "gameweek": event_data["gameweek"],
                "is_current_gameweek": event_data["gameweek"] == current_gameweek,
                "events": event_data["stats"],
            })

    return results
