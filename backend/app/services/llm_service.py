import time
import logging
from openai import OpenAI
from pydantic import BaseModel
from typing import List
from app.core.config import settings

logger = logging.getLogger("dekho.llm")

def get_llm_providers():
    """Returns configured (client, model) pairs in priority order: Groq first, then OpenRouter."""
    providers = []
    if settings.GROQ_API_KEY:
        providers.append((
            OpenAI(api_key=settings.GROQ_API_KEY, base_url="https://api.groq.com/openai/v1"),
            "openai/gpt-oss-120b",  # verified available/working on this Groq account
        ))
    if settings.OPENROUTER_API_KEY:
        providers.append((
            OpenAI(api_key=settings.OPENROUTER_API_KEY, base_url="https://openrouter.ai/api/v1"),
            "meta-llama/llama-3.3-70b-instruct",  # verified available/working on OpenRouter
        ))
    return providers

def _call_llm(client, model, system_prompt: str, messages: list) -> str:
    """Single LLM API call."""
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": system_prompt}] + messages,
        temperature=0.5,
    )
    return response.choices[0].message.content or "I don't have a clear answer for that right now."


def generate_chat_response(system_prompt: str, chat_history: List[BaseModel], latest_message: str) -> str:
    """
    Generates a response from the LLM using the structured RAG context.
    Tries each configured provider in order (Groq, then OpenRouter), with one
    retry after a 1s delay against the last configured provider before giving up.
    """
    providers = get_llm_providers()
    if not providers:
        return "There's a configuration issue on the server side. The API key is missing (Groq or OpenRouter)."

    # Build conversation history
    messages = []
    for msg in chat_history:
        role = "assistant" if msg.role == "assistant" else "user"
        messages.append({"role": role, "content": msg.content})

    # Append the latest user message
    messages.append({"role": "user", "content": latest_message})

    for i, (client, model) in enumerate(providers):
        try:
            return _call_llm(client, model, system_prompt, messages)
        except Exception as e:
            logger.warning(f"LLM call to provider {i + 1}/{len(providers)} ({model}) failed: {e}")

    # All providers failed once — retry the last one after a short delay.
    client, model = providers[-1]
    time.sleep(1)
    try:
        return _call_llm(client, model, system_prompt, messages)
    except Exception as e:
        logger.error(f"LLM retry also failed: {e}")
        return "I'm having trouble connecting right now. Please try again in a moment."
