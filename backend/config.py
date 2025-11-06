"""Configuration module for managing environment variables."""

from pydantic_settings import BaseSettings
from typing import List
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API Keys
    openai_api_key: str
    pinecone_api_key: str

    # Pinecone Configuration
    pinecone_environment: str = "gcp-starter"  # Free tier environment
    pinecone_index_name: str = "interview-bot"

    # CORS Configuration
    cors_origins: str = "http://localhost:3000"

    # Document Processing
    chunk_size: int = 1000  # Characters per chunk
    chunk_overlap: int = 200  # Overlap between chunks
    max_file_size: int = 5 * 1024 * 1024  # 5MB

    # Model Configuration
    embedding_model: str = "text-embedding-3-small"  # OpenAI's smallest, cheapest model
    llm_model: str = "gpt-4o-mini"  # OpenAI's fast, affordable model
    max_tokens: int = 500
    temperature: float = 0.7

    class Config:
        """Pydantic configuration."""
        env_file = ".env"
        case_sensitive = False

    def get_cors_origins_list(self) -> List[str]:
        """Convert comma-separated CORS origins string to list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get the application settings instance."""
    return settings
