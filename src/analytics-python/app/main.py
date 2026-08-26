from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db.pool import (
    close_database_pool,
    database_pool,
    open_database_pool,
)
from app.routes.projects import router as projects_router
from app.routes.benchmarking import router as benchmarking_router


settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    open_database_pool()
    yield
    close_database_pool()


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["Accept", "Content-Type"],
)

app.include_router(projects_router)

app.include_router(benchmarking_router)

@app.get("/health", tags=["Health"])
def health() -> dict[str, str]:
    try:
        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1 AS result;")
                row = cursor.fetchone()

        if not row or row["result"] != 1:
            raise RuntimeError("Unexpected database response.")

        return {
            "status": "healthy",
            "database": "connected",
        }

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Database connection is unavailable.",
        ) from exc