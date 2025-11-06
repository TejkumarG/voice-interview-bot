"""Embedding service using OpenAI API for vector generation."""

from openai import OpenAI
from typing import List
import time


class EmbeddingService:
    """Service for generating text embeddings using OpenAI API."""

    def __init__(self, api_key: str, model: str = "text-embedding-3-small"):
        """Initialize embedding service."""
        if not api_key:
            raise ValueError("OpenAI API key is required")

        self.client = OpenAI(api_key=api_key)
        self.model = model

    def embed_text(self, text: str) -> List[float]:
        """Generate embedding for a single text."""
        try:
            # Clean and truncate text if needed
            text = text.strip()
            if not text:
                raise ValueError("Text cannot be empty")

            # Call OpenAI API
            response = self.client.embeddings.create(
                model=self.model,
                input=text
            )

            # Extract embedding vector
            embedding = response.data[0].embedding

            return embedding

        except Exception as e:
            raise Exception(f"Failed to generate embedding: {str(e)}")

    def embed_batch(self, texts: List[str], batch_size: int = 100) -> List[List[float]]:
        """Generate embeddings for multiple texts in batches."""
        if not texts:
            return []

        all_embeddings = []

        # Process in batches
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]

            try:
                # Call OpenAI API for batch
                response = self.client.embeddings.create(
                    model=self.model,
                    input=batch
                )

                # Extract embeddings in order
                batch_embeddings = [item.embedding for item in response.data]
                all_embeddings.extend(batch_embeddings)

                # Small delay to avoid rate limits (only if processing large batches)
                if i + batch_size < len(texts):
                    time.sleep(0.1)

            except Exception as e:
                raise Exception(f"Failed to generate batch embeddings: {str(e)}")

        return all_embeddings

    def get_embedding_dimension(self) -> int:
        """Get the dimension of embeddings produced by this model."""
        # Hardcoded for known models (to avoid unnecessary API calls)
        model_dimensions = {
            "text-embedding-3-small": 1536,
            "text-embedding-3-large": 3072,
            "text-embedding-ada-002": 1536
        }

        return model_dimensions.get(self.model, 1536)

    def calculate_cost(self, num_tokens: int) -> float:
        """Estimate cost for embedding generation."""
        # Pricing as of 2024 (check OpenAI pricing page for updates)
        cost_per_million_tokens = 0.02  # text-embedding-3-small

        cost = (num_tokens / 1_000_000) * cost_per_million_tokens
        return round(cost, 6)
