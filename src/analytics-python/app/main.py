from fastapi import FastAPI
from models import (ProjectAnalysisRequest, 
                    ProjectAnalysisResponse)
from cost_metrics import (calculate_avg_item_cost, 
                          calculate_cost_per_m2, 
                          calculate_margin, 
                          calculate_margin_percentage)

import uvicorn


app = FastAPI()


@app.post("/analyze-project")
async def analyze_project(request: ProjectAnalysisRequest):

    cost_per_m2 = calculate_cost_per_m2(request.total_cost, request.floor_area)

    margin = calculate_margin(request.total_cost, request.total_selling_price)

    margin_pct = calculate_margin_percentage(request.total_cost, request.total_selling_price)

    avg_item_cost = calculate_avg_item_cost(request.total_cost, request.item_count)

    return ProjectAnalysisResponse(
        cost_per_m2=cost_per_m2,
        margin=margin,
        margin_percentage=margin_pct,
        avg_item_cost=avg_item_cost
    )

   
    

if __name__ == "__main__":
    uvicorn.run("main:app", reload=True) #workers=5
