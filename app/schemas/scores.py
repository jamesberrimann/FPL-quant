from typing import Optional

from pydantic import BaseModel


class TeamScoreOut(BaseModel):
    team_id: int
    team_name: str
    team_short_name: str
    gameweek: int
    is_current_gameweek: bool
    is_home: bool
    team_score: Optional[int]
    opponent_id: int
    opponent_name: str
    opponent_short_name: str
    opponent_score: Optional[int]
    fully_confirmed: bool


class SquadScoresOut(BaseModel):
    scores: list[TeamScoreOut]


class PlayerLiveEventOut(BaseModel):
    player_id: int
    web_name: str
    position: str
    team_short_name: str
    gameweek: int
    is_current_gameweek: bool
    events: dict[str, int]


class SquadLiveEventsOut(BaseModel):
    events: list[PlayerLiveEventOut]


class PlayerGWPointsOut(BaseModel):
    player_id: int
    web_name: str
    points: int
    minutes: int
    has_played: bool
    is_captain: bool
    is_vice_captain: bool
    multiplier: int
    position_in_squad: int


class SquadGWPointsOut(BaseModel):
    gameweek: int
    is_live_gw: bool
    players: list[PlayerGWPointsOut]
