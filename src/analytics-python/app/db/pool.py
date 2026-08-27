from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.core.config import get_settings


settings = get_settings()


database_pool = ConnectionPool(
    conninfo=settings.database_connection_string,

    min_size=settings.database_pool_min_size,
    max_size=settings.database_pool_max_size,

    timeout=30,
    max_idle=300,
    max_lifetime=1800,

    check=ConnectionPool.check_connection,

    kwargs={
        "autocommit": True,
        "row_factory": dict_row,

        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    },

    open=False,
)


def open_database_pool() -> None:
    database_pool.open(wait=True)


def close_database_pool() -> None:
    database_pool.close()