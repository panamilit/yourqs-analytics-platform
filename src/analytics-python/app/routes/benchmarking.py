from fastapi import APIRouter, Depends

from app.dependencies.current_user import get_current_user

from app.repositories.benchmarking_repository import (
    BenchmarkingRepository,
)
from app.schemas.benchmarking import (
    ProjectBenchmarkResponse,
)
from app.services.benchmarking_service import (
    BenchmarkingService,
)


router = APIRouter(
    prefix="/api/benchmarking",
    tags=["Benchmarking"],
    dependencies=[Depends(get_current_user)],
)

repository = BenchmarkingRepository()
service = BenchmarkingService(repository)


@router.get(
    "/projects/{project_id}",
    response_model=ProjectBenchmarkResponse,
    response_model_by_alias=True,
)
def get_project_benchmark(
    project_id: str,
) -> ProjectBenchmarkResponse:
    return service.get_project_benchmark(project_id)