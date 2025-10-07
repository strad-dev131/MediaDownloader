import asyncio
import os
import signal
import tempfile
from dataclasses import dataclass
from typing import Dict, Optional

from pyrogram import Client
from pytgcalls import GroupCallFactory
from pytgcalls.implementation.group_call_file import GroupCallFile

from .downloader import TrackInfo
from .queue import PlaybackQueue


@dataclass
class ChatPlayerState:
    queue: PlaybackQueue
    group_call: GroupCallFile
    fifo_path: str
    ffmpeg_proc: Optional[asyncio.subprocess.Process] = None
    current_track: Optional[TrackInfo] = None
    volume: int = 100  # 1..200 enforced in handlers
    joining: bool = False


class VoicePlayerManager:
    """
    Manages per-chat voice players using PyTgCalls GroupCallFile and ffmpeg.
    """

    def __init__(self, app: Client, assistant_id: int):
        self.app = app
        self.assistant_id = assistant_id
        self.group_call_factory = GroupCallFactory(app)
        self.players: Dict[int, ChatPlayerState] = {}

    def _ensure_player(self, chat_id: int) -> ChatPlayerState:
        if chat_id in self.players:
            return self.players[chat_id]

        fifo_dir = tempfile.mkdtemp(prefix=f"tg_music_{chat_id}_")
        fifo_path = os.path.join(fifo_dir, "input.pcm")
        # Create named pipe FIFO
        if not os.path.exists(fifo_path):
            os.mkfifo(fifo_path)

        group_call = self.group_call_factory.get_file_group_call(fifo_path)
        state = ChatPlayerState(
            queue=PlaybackQueue(chat_id),
            group_call=group_call,
            fifo_path=fifo_path,
        )

        # Auto handler: when playout ends, start next track or leave
        @group_call.on_playout_ended
        async def _on_playout_ended(gc, filename):
            await self._on_track_end(chat_id)

        self.players[chat_id] = state
        return state

    async def join_voice_chat(self, chat_id: int) -> bool:
        """
        Attempt to join the active voice chat in a given chat.
        Returns True on success, False otherwise.
        """
        state = self._ensure_player(chat_id)

        if state.group_call.is_connected:
            return True

        if state.joining:
            return False

        state.joining = True
        try:
            await state.group_call.start(chat_id, join_as=self.assistant_id)
            return True
        except Exception as e:
            # Could be: no active VC, permission issue, bot join not allowed
            # Defer actual feedback to handlers; just return failure here.
            return False
        finally:
            state.joining = False

    async def _spawn_ffmpeg(self, input_url: str, fifo_path: str, volume: int) -> asyncio.subprocess.Process:
        """
        Spawn ffmpeg process to transcode input_url into PCM s16le 48k written to fifo_path.
        """
        # Clamp and convert volume (fraction)
        vol = max(1, min(int(volume), 200))
        vol_filter = f"volume={vol/100.0:.3f}"

        # -re improves stability by reading input at native rate
        cmd = [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-re",
            "-i",
            input_url,
            "-vn",
            "-acodec",
            "pcm_s16le",
            "-f",
            "s16le",
            "-ac",
            "2",
            "-ar",
            "48000",
            "-filter:a",
            vol_filter,
            fifo_path,
        ]

        return await asyncio.create_subprocess_exec(*cmd)

    async def _start_track(self, chat_id: int, track: TrackInfo):
        state = self._ensure_player(chat_id)

        # Ensure joined
        if not state.group_call.is_connected:
            joined = await self.join_voice_chat(chat_id)
            if not joined:
                raise RuntimeError("Unable to join the voice chat")

        # Stop any current ffmpeg
        await self._stop_ffmpeg(chat_id)

        # Spawn ffmpeg writer to FIFO
        proc = await self._spawn_ffmpeg(track.url, state.fifo_path, state.volume)
        state.ffmpeg_proc = proc
        state.current_track = track

    async def _stop_ffmpeg(self, chat_id: int):
        state = self._ensure_player(chat_id)
        proc = state.ffmpeg_proc
        if proc and proc.returncode is None:
            # Terminate gracefully
            try:
                proc.send_signal(signal.SIGINT)
                await asyncio.sleep(0.2)
            except ProcessLookupError:
                pass
            try:
                proc.kill()
            except ProcessLookupError:
                pass
        state.ffmpeg_proc = None

    async def add_to_queue(self, chat_id: int, track: TrackInfo) -> bool:
        state = self._ensure_player(chat_id)
        ok = state.queue.add(track)
        return ok

    async def play_or_queue(self, chat_id: int, track: TrackInfo) -> str:
        """
        If nothing is playing, start immediately; otherwise queue.
        """
        state = self._ensure_player(chat_id)
        if state.current_track is None and len(state.queue) == 0:
            await self._start_track(chat_id, track)
            return f"▶️ Playing: {track.title}"
        else:
            ok = await self.add_to_queue(chat_id, track)
            if ok:
                return f"➕ Queued: {track.title} (position {len(state.queue)})"
            else:
                return "Queue is full. Please wait or /skip."

    async def pause(self, chat_id: int) -> bool:
        state = self._ensure_player(chat_id)
        if state.group_call.is_connected and state.current_track:
            state.group_call.pause_playout()
            return True
        return False

    async def resume(self, chat_id: int) -> bool:
        state = self._ensure_player(chat_id)
        if state.group_call.is_connected and state.current_track:
            state.group_call.resume_playout()
            return True
        return False

    async def skip(self, chat_id: int) -> Optional[str]:
        state = self._ensure_player(chat_id)
        if not state.current_track:
            return None
        # Stop current and start next
        await self._stop_ffmpeg(chat_id)
        next_track = state.queue.pop_next()
        if next_track:
            await self._start_track(chat_id, next_track)
            return f"⏭️ Skipped. Now playing: {next_track.title}"
        else:
            # No next track; stop playback and leave
            await self.stop(chat_id)
            return "⏹️ Stopped. Queue is empty."

    async def set_volume(self, chat_id: int, volume: int) -> int:
        """
        Set desired volume (1-200). Applies on next track; if a track is playing,
        restart it at the new volume.
        """
        state = self._ensure_player(chat_id)
        vol = max(1, min(int(volume), 200))
        state.volume = vol

        # Restart current track at new volume
        if state.current_track:
            await self._stop_ffmpeg(chat_id)
            await self._start_track(chat_id, state.current_track)

        return vol

    async def _on_track_end(self, chat_id: int):
        """
        Handler called when playout ends (file finished).
        """
        state = self._ensure_player(chat_id)
        # Clear current track
        state.current_track = None
        # Start next if exists
        next_track = state.queue.pop_next()
        if next_track:
            await self._start_track(chat_id, next_track)
        else:
            # Leave VC
            await self.stop(chat_id)

    async def stop(self, chat_id: int) -> bool:
        state = self._ensure_player(chat_id)
        await self._stop_ffmpeg(chat_id)
        state.current_track = None
        state.queue.clear()
        try:
            await state.group_call.stop()
            return True
        except Exception:
            return False

    def queue_snapshot(self, chat_id: int) -> str:
        state = self._ensure_player(chat_id)
        if state.current_track:
            head = f"Now playing: {state.current_track.title}\n"
        else:
            head = "Nothing is playing.\n"

        if len(state.queue) == 0:
            return head + "Queue is empty."

        return head + "Up next:\n" + "\n".join(state.queue.snapshot())