from pydantic import BaseModel


class FHSquadPlayerOut(BaseModel):
    web_name: str
    position: str
    team_short_name: str
    price: float
    projected_pts: float
    fixture_label: str | None = None


class FHSquadOut(BaseModel):
    players: list[FHSquadPlayerOut]
    total_cost: float
    projected_gw_pts: float
    budget: float
    gameweek: int


class ChipAvailability(BaseModel):
    triple_captain: bool = True
    bench_boost: bool = True
    free_hit: bool = True
    wildcard1: bool = True
    wildcard2: bool = True


class TCCandidate(BaseModel):
    player_name: str
    player_score: float
    is_dgw: bool


class TripleCaptainWindowOut(BaseModel):
    gameweek: int
    best_player_name: str
    best_player_score: float
    is_dgw: bool
    reason: str
    candidates: list[TCCandidate] = []


class BenchBoostWindowOut(BaseModel):
    gameweek: int
    dgw_count: int
    reason: str
    projected_squad_pts: float | None = None
    dgw_player_names: list[str] = []


class FreeHitWindowOut(BaseModel):
    gameweek: int
    blank_count: int
    reason: str
    squad_projected_pts: float | None = None


class WildcardWindowOut(BaseModel):
    gameweek: int
    reason: str
    wc_number: int = 1


class ChipPlanOut(BaseModel):
    triple_captain: TripleCaptainWindowOut | None = None
    bench_boost: BenchBoostWindowOut | None = None
    free_hit: list[FreeHitWindowOut] = []
    wildcard: WildcardWindowOut | None = None
    chips_available: ChipAvailability = ChipAvailability()
