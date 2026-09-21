from fastapi import APIRouter, Depends

from app.dependencies.current_user import get_current_user

from app.repositories.what_if_repository import (
    WhatIfRepository,
)
from app.schemas.what_if import (
    WhatIfRequest,
    WhatIfResponse,
)
from app.services.what_if_service import (
    WhatIfService,
)


router = APIRouter(
    prefix="/api/what-if",
    tags=["What-if Analysis"],
    dependencies=[Depends(get_current_user)],
)

repository = WhatIfRepository()
service = WhatIfService(repository)


@router.post(
    "/projects/{project_id}",
    response_model=WhatIfResponse,
    response_model_by_alias=True,
)
def run_what_if_scenario(
    project_id: str,
    request: WhatIfRequest,
) -> WhatIfResponse:
    return service.run_scenario(
        project_id,
        request,
    )