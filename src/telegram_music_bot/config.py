import os
from dataclasses import dataclass

try:
    # Optional: load .env if present
    from dotenv import load_dotenv

    load_dotenv()
except Exception:
    pass


@dataclass(frozen=True)
class Settings:
    api_id: int
    api_hash: str
    bot_token: str
    assistant_id: int


def get_settings() -> Settings:
    api_id = os.getenv("API_ID")
    api_hash = os.getenv("API_HASH")
    bot_token = os.getenv("BOT_TOKEN")
    assistant_id = os.getenv("ASSISTANT_ID")

    if not api_id or not api_hash or not bot_token or not assistant_id:
        missing = [
            name
            for name, val in [
                ("API_ID", api_id),
                ("API_HASH", api_hash),
                ("BOT_TOKEN", bot_token),
                ("ASSISTANT_ID", assistant_id),
            ]
            if not val
        ]
        raise RuntimeError(
            f"Missing required environment variables: {', '.join(missing)}. "
            "Set them via environment or .env file."
        )

    try:
        api_id_int = int(api_id)
    except ValueError:
        raise RuntimeError("API_ID must be an integer")

    try:
        assistant_id_int = int(assistant_id)
    except ValueError:
        raise RuntimeError("ASSISTANT_ID must be an integer")

    return Settings(
        api_id=api_id_int,
        api_hash=api_hash,
        bot_token=bot_token,
        assistant_id=assistant_id_int,
    )