"""Application configuration from environment variables."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/roar"
    jwt_secret_key: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480
    n8n_webhook_base_url: str = "http://localhost:5678/webhook"
    n8n_webhook_secret: str = "dev-webhook-secret"
    openai_api_key: str = ""
    app_env: str = "development"

    model_config = SettingsConfigDict(env_file="api/.env")


settings = Settings()



