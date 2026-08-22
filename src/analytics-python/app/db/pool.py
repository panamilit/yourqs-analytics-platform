from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.core.config import get_settings


settings = get_settings()

database_pool = ConnectionPool(
    conninfo=settings.database_connection_string,
    min_size=settings.database_pool_min_size,
    max_size=settings.database_pool_max_size,
    kwargs={
        "autocommit": True,
        "row_factory": dict_row,
    },
    open=False,
)


def open_database_pool() -> None:
    database_pool.open(wait=True)


def close_database_pool() -> None:
    database_pool.close()