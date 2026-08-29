"""
Application settings.

This layer exists so secrets and environment-specific values are not
hard-coded. Values are loaded from a .env file (and real environment variables).
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Transportation Logistics Management System"
    app_env: str = "development"
    api_prefix: str = "/api"

    database_url: str = "sqlite:///./data/tlms.db"

    secret_key: str = "change-this-to-a-long-random-string"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 120

    cors_origins: str = "http://localhost:3000,http://localhost:5173,https://fleetguard-sih.netlify.app"

    ai_mode: str = "stub"  # stub | http | gemini
    ai_module_url: str = "http://localhost:8001"
    ai_timeout_seconds: int = 15
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    optimizer_mode: str = "stub"
    optimizer_url: str = "http://localhost:8002"
    optimizer_timeout_seconds: int = 15

    # Public demo server; point this at a self-hosted OSRM instance in production.
    osrm_url: str = "http://router.project-osrm.org"
    osrm_timeout_seconds: int = 15

    @property
    def cors_origin_list(self):
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings():
    return Settings()
