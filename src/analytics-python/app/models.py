from pydantic import BaseModel

class ProjectAnalysisRequest(BaseModel):
    total_cost: float
    total_selling_price: float
    floor_area: float
    item_count: int


class ProjectAnalysisResponse(BaseModel):
    cost_per_m2: float | None
    margin: float
    margin_percentage: float | None
    avg_item_cost: float | None

