import asyncio
import time
from typing import Dict

from pyrogram import Client, filters
from pyrogram.types import Message

from .downloader import resolve_query_to_track
from .player import VoicePlayerManager
from .config import Settings


class CommandRateLimiter:
    def __init__(self, cooldown_sec: float = 0.75):
        self.cooldown_sec = cooldown_sec
        self.last: Dict[int, float] = {}

    def allow(self, user_id: int) -> bool:
        now = time.time()
        last = self.last.get(user_id, 0)
        if now - last >= self.cooldown_sec:
            self.last[user_id] = now
            return True
        return False


async def is_admin(app: Client, chat_id: int, user_id: int) -> bool:
    try:
        member = await app.get_chat_member(chat_id, user_id)
        return member.status in ("creator", "administrator")
    except Exception:
        return False


def register_handlers(app: Client, settings: Settings) -> VoicePlayerManager:
    players = VoicePlayerManager(app, assistant_id=settings.assistant_id)
    rate = CommandRateLimiter()

    @app.on_message(filters.command("play") & filters.group)
    async def on_play(_, message: Message):
        if not message.command or len(message.command) < 2:
            await message.reply_text("Usage: /play <song name or YouTube/Spotify link>")
            return

        if not rate.allow(message.from_user.id if message.from_user else 0):
            return

        query = " ".join(message.command[1:])
        track = resolve_query_to_track(query)
        if not track:
            await message.reply_text("Song not found. Try a different query or a direct YouTube link.")
            return

        # Attempt to join VC
        joined = await players.join_voice_chat(message.chat.id)
        if not joined:
            await message.reply_text(
                "Unable to join the voice chat. Is there an active VC and does the bot have permissions?\n\n"
                "Note: Some Telegram environments require joining via an assistant user account. "
                "Add the assistant (ID provided in config) to your group and grant 'Manage Voice Chats' if needed."
            )
            return

        status = await players.play_or_queue(message.chat.id, track)
        await message.reply_text(status)

    @app.on_message(filters.command("pause") & filters.group)
    async def on_pause(_, message: Message):
        if not rate.allow(message.from_user.id if message.from_user else 0):
            return
        ok = await players.pause(message.chat.id)
        await message.reply_text("⏸️ Paused." if ok else "Nothing is playing.")

    @app.on_message(filters.command("resume") & filters.group)
    async def on_resume(_, message: Message):
        if not rate.allow(message.from_user.id if message.from_user else 0):
            return
        ok = await players.resume(message.chat.id)
        await message.reply_text("▶️ Resumed." if ok else "Nothing is playing.")

    @app.on_message(filters.command("skip") & filters.group)
    async def on_skip(_, message: Message):
        if not rate.allow(message.from_user.id if message.from_user else 0):
            return
        status = await players.skip(message.chat.id)
        await message.reply_text(status or "Nothing to skip.")

    @app.on_message(filters.command("stop") & filters.group)
    async def on_stop(_, message: Message):
        if not await is_admin(app, message.chat.id, message.from_user.id if message.from_user else 0):
            await message.reply_text("Only chat admins can use /stop.")
            return
        ok = await players.stop(message.chat.id)
        await message.reply_text("⏹️ Stopped and left VC." if ok else "Not connected to VC.")

    @app.on_message(filters.command("queue") & filters.group)
    async def on_queue(_, message: Message):
        snapshot = players.queue_snapshot(message.chat.id)
        await message.reply_text(snapshot)

    @app.on_message(filters.command("volume") & filters.group)
    async def on_volume(_, message: Message):
        if not await is_admin(app, message.chat.id, message.from_user.id if message.from_user else 0):
            await message.reply_text("Only chat admins can use /volume.")
            return

        if not message.command or len(message.command) < 2:
            await message.reply_text("Usage: /volume <level 1-200>")
            return

        try:
            level = int(message.command[1])
        except ValueError:
            await message.reply_text("Volume must be an integer between 1 and 200.")
            return

        vol = await players.set_volume(message.chat.id, level)
        await message.reply_text(f"🔊 Volume set to {vol}.")

    return players