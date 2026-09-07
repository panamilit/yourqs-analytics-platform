from functools import lru_cache

from pydantic import Field
from pydantic_settings import (
    BaseSettings,
    SettingsConfigDict,
)


class Settings(BaseSettings):
    app_name: str = "YourQS Analytics API"
    app_env: str = "development"

    # ==========================================================
    # Database
    # ==========================================================

    database_host: str
    database_port: int = 5432
    database_name: str = "postgres"
    database_user: str
    database_password: str
    database_sslmode: str = "require"

    database_pool_min_size: int = Field(
        default=1,
        ge=1,
    )

    database_pool_max_size: int = Field(
        default=5,
        ge=1,
    )

    # ==========================================================
    # CORS
    # ==========================================================

    cors_origins: str = (
        "http://127.0.0.1:5500,"
        "http://localhost:5500"
    )

    # ==========================================================
    # Prototype authentication
    # ==========================================================

    jwt_secret_key: str
    jwt_algorithm: str = "HS256"

    jwt_expire_minutes: int = Field(
        default=1440,
        ge=5,
    )

    registration_access_code: str

    # ==========================================================
    # Supabase Storage
    #
    # IMPORTANT:
    # Service role key is BACKEND ONLY.
    # Never expose it to frontend JavaScript.
    # ==========================================================

    supabase_url: str
    supabase_service_role_key: str

    feasibility_storage_bucket: str = (
        "feasibility-review-files"
    )

    feasibility_max_files: int = Field(
        default=5,
        ge=1,
        le=10,
    )

    feasibility_max_file_size_bytes: int = Field(
        default=15 * 1024 * 1024,
        ge=1,
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def database_connection_string(
        self,
    ) -> str:
        return (
            f"host={self.database_host} "
            f"port={self.database_port} "
            f"dbname={self.database_name} "
            f"user={self.database_user} "
            f"password={self.database_password} "
            f"sslmode={self.database_sslmode}"
        )

    @property
    def cors_origin_list(
        self,
    ) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()