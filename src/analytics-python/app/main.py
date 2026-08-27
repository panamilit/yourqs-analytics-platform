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
from app.routes import comparison, what_if

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
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects_router)

app.include_router(benchmarking_router)

app.include_router(comparison.router)

app.include_router(what_if.router)


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