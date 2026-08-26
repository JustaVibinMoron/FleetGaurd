from backend.ai import ai_client
from backend.ai import gemini_client
from backend.config.settings import get_settings
from backend.utils.exceptions import AppError


def _gemini_fallback(context: dict, optimizer_result: dict, error: AppError) -> dict:
    return {
        "decision": "MAINTAIN",
        "risk": "MEDIUM",
        "recommendedRoute": optimizer_result["recommendedRoute"],
        "estimatedTime": optimizer_result["estimatedTime"],
        "fuelSaving": optimizer_result.get("fuelSaving", 0.0),
        "reason": "AI decision support unavailable ({0}); deterministic optimizer recommendation retained.".format(
            error.code
        ),
        "actions": ["Review the deterministic optimizer recommendation and retry AI analysis later."],
        "source": "ai-fallback",
        "aiError": {"code": error.code, "message": error.message},
    }


def request_ai_recommendation(context: dict, optimizer_result: dict | None = None) -> dict:
    settings = get_settings()
    mode = settings.ai_mode.lower()
    if mode == "http":
        return ai_client.http_recommend(context)
    if mode == "gemini":
        try:
            return gemini_client.gemini_recommend(context)
        except AppError as error:
            if optimizer_result is None:
                raise
            return _gemini_fallback(context, optimizer_result, error)
    return ai_client.stub_recommend(context)
