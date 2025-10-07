import asyncio
import logging

from pyrogram import Client

from .config import get_settings
from .handlers import register_handlers

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)


def main():
    settings = get_settings()

    app = Client(
        "music_bot",
        api_id=settings.api_id,
        api_hash=settings.api_hash,
        bot_token=settings.bot_token,
        in_memory=False,
    )

    # Register command handlers and initialize player manager
    register_handlers(app, settings)

    # Start bot
    app.run()


if __name__ == "__main__":
    main()