from uuid import uuid4

from app.schemas.combined_feasibility import (
    CombinedFeasibilityEstimate,
    CombinedFeasibilityRequest,
    CombinedFeasibilityResponse,
)
from app.schemas.feasibility import FeasibilityRequest


def assess_combined(request: CombinedFeasibilityRequest, service):
    session_id = request.session_id or uuid4()
    results = {}

    # use the existing calculation for each part, with its own answers
    for project_type in ("renovation", "extension"):
        part = getattr(request, project_type)
        results[project_type] = service.assess(FeasibilityRequest(
            session_id=session_id,
            project_type=project_type,
            area=part.area,
            layout=part.layout,
            scope=part.scope,
        ))

    renovation = results["renovation"]
    extension = results["extension"]
    estimate = None
    budget = None
    status = "insufficient_data"

    # don't show half a result as the cost of the whole job
    if (renovation.status == "completed" and extension.status == "completed"
            and renovation.estimate is not None and extension.estimate is not None):
        estimate = CombinedFeasibilityEstimate(
            low=renovation.estimate.low + extension.estimate.low,
            typical=renovation.estimate.typical + extension.estimate.typical,
            high=renovation.estimate.high + extension.estimate.high,
        )
        status = "completed"
        if request.budget is not None:
            # the shared budget is checked once, against both parts together
            budget = service._assess_budget(
                budget=request.budget,
                low_estimate=estimate.low,
                typical_estimate=estimate.typical,
            )

    return CombinedFeasibilityResponse(
        session_id=session_id,
        status=status,
        renovation=renovation,
        extension=extension,
        estimate=estimate,
        budget=budget,
    )
