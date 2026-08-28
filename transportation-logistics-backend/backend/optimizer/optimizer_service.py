from backend.config.settings import get_settings
from backend.optimizer import optimizer_client


def request_optimizer_plan(context: dict) -> dict:
    settings = get_settings()
    mode = settings.optimizer_mode.lower()
    if mode == "http":
        return optimizer_client.http_optimize(context)
    if mode == "function":
        return optimizer_client.function_optimize(context)
    if mode in {"local", "ortools", "engine"}:
        return optimizer_client.local_optimize(context)
    return optimizer_client.deterministic_optimize(context)
