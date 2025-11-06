"""LLM service using OpenAI API for chat responses."""

from openai import OpenAI
from typing import List, Dict, Optional


class LLMService:
    """Service for generating responses using OpenAI LLM."""

    def __init__(
        self,
        api_key: str,
        model: str = "gpt-4o-mini",
        max_tokens: int = 500,
        temperature: float = 0.7
    ):
        """Initialize LLM service."""
        if not api_key:
            raise ValueError("OpenAI API key is required")

        self.client = OpenAI(api_key=api_key)
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature

    def generate_response(
        self,
        user_message: str,
        context: Optional[str] = None
    ) -> str:
        """Generate response to user's question."""
        try:
            # Build system prompt
            system_prompt = self._build_system_prompt(context)

            # Build messages
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ]

            # Call OpenAI API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )

            # Extract response text
            answer = response.choices[0].message.content.strip()

            return answer

        except Exception as e:
            raise Exception(f"Failed to generate response: {str(e)}")

    def _build_system_prompt(self, context: Optional[str] = None) -> str:
        """Build system prompt for LLM."""
        base_prompt = """You are an AI assistant helping with interview questions.
You represent the candidate and answer questions as they would answer them.

Guidelines:
- Be conversational and natural
- Keep responses concise (2-3 sentences unless more detail is requested)
- Be professional but authentic
- Use first person ("I", "my", "me")
- If you don't have specific information, respond naturally without making up details"""

        if context:
            # Add context from retrieved documents
            prompt_with_context = f"""{base_prompt}

CANDIDATE BACKGROUND:
{context}

Use the background information above to answer questions about the candidate.
Base your answers on this information, speaking as the candidate."""

            return prompt_with_context

        return base_prompt

    def generate_with_chat_history(
        self,
        user_message: str,
        chat_history: List[Dict[str, str]],
        context: Optional[str] = None
    ) -> str:
        """Generate response with conversation history."""
        try:
            # Build system prompt
            system_prompt = self._build_system_prompt(context)

            # Build messages with history
            messages = [{"role": "system", "content": system_prompt}]

            # Add chat history (limit to last 10 messages to avoid token limits)
            for msg in chat_history[-10:]:
                messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })

            # Add current message
            messages.append({"role": "user", "content": user_message})

            # Call OpenAI API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )

            answer = response.choices[0].message.content.strip()
            return answer

        except Exception as e:
            raise Exception(f"Failed to generate response with history: {str(e)}")

    def format_context(self, search_results: List[Dict]) -> str:
        """Format retrieved chunks into context string."""
        if not search_results:
            return ""

        # Sort by score (highest first)
        sorted_results = sorted(search_results, key=lambda x: x.get("score", 0), reverse=True)

        # Combine top results
        context_parts = []
        for i, result in enumerate(sorted_results[:5], 1):  # Top 5 results
            text = result.get("text", "").strip()
            if text:
                context_parts.append(text)

        # Join with newlines
        context = "\n\n".join(context_parts)

        return context
