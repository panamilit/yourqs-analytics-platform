from fastapi import APIRouter

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