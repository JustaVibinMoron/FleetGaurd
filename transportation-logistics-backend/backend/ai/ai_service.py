from backend.ai import ai_client
from backend.config.settings import get_settings


def request_ai_recommendation(context: dict) -> dict:
    settings = get_settings()
    mode = settings.ai_mode.lower()
    if mode == "http":
        return ai_client.http_recommend(context)
    return ai_client.stub_recommend(context)
