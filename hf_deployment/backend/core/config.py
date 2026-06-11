from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    PROJECT_NAME: str = "ERA_CURITY API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # API Keys
    GROQ_API_KEY: str = ""
    HF_TOKEN: str = ""

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
