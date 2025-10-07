# Telegram Voice Chat Music Bot

A professional, production-ready Telegram music bot that can join voice chats (VC) and play songs on demand from YouTube and other sources. Built with Pyrogram and PyTgCalls, with ffmpeg-based streaming and robust queue management.

- GitHub: https://github.com/strad-dev131
- Owner/Developer: @EliteSid_Xd

## Features

- Zero-setup: provide only API ID, API Hash, Bot Token, and Assistant ID.
- Join active group voice chats and stream audio.
- Commands:
  - `/play &lt;query or link&gt;` — queue and play music (supports YouTube links and queries; Spotify links are resolved to YouTube).
  - `/pause` — pause current track.
  - `/resume` — resume playback.
  - `/skip` — skip to next track in queue.
  - `/stop` — stop playback and leave VC.
  - `/queue` — show current queue.
  - `/volume &lt;0-200&gt;` — set playback volume (default 100). Note: takes effect from next track.
- Multi-language queries supported (Hindi, English, Spanish, etc.) via YouTube search.
- Playlist and queue management (optional advanced features).
- Clear feedback and robust error handling.

## Important Note about Telegram Voice Chats

Telegram Bot API does not officially allow regular bot accounts to join voice chats. This project uses the industry-standard approach via MTProto and the PyTgCalls library. Depending on Telegram restrictions in your environment, the bot may need to use an assistant identity to join the call.

- If bots cannot join voice chats in your group, add an assistant account (a Telegram user you control) to the group and make it an admin with “Manage voice chats” permission.
- Set `ASSISTANT_ID` to that assistant’s Telegram ID. The code will attempt to join the voice chat with that identity where possible.

This repository is designed to work out of the box with standard Telegram constraints and will provide actionable feedback if joining the VC is blocked.

## Quick Start

### 1) Requirements

- Python 3.10+
- ffmpeg installed on system (Dockerfile includes it)
- The following credentials from https://my.telegram.org:
  - API ID
  - API Hash
  - Bot Token (via @BotFather)
  - Assistant ID (numeric Telegram ID of the assistant identity)

### 2) Configuration

Create a `.env` file (or copy `.env.example`):

```
API_ID=123456
API_HASH=your_api_hash_here
BOT_TOKEN=123456:ABC-XYZ_your_bot_token
ASSISTANT_ID=123456789
```

### 3) Install and Run (Local)

```
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export PYTHONPATH=src
python -m telegram_music_bot
```

### 4) Docker

Build and run:

```
docker build -t telegram-music-bot .
docker run --rm -it \
  -e API_ID=123456 \
  -e API_HASH=your_api_hash_here \
  -e BOT_TOKEN=123456:ABC-XYZ_your_bot_token \
  -e ASSISTANT_ID=123456789 \
  telegram-music-bot
```

## Commands

- `/play &lt;song name or YouTube/Spotify link&gt;`
- `/pause`
- `/resume`
- `/skip`
- `/stop`
- `/queue`
- `/volume &lt;level 0-200&gt;`

Admin-only safeguards:
- `/stop` and `/volume` are restricted to chat admins to reduce misuse.
- Basic per-user rate limiting to reduce spam.

## Supported Sources

- YouTube queries and links via `yt-dlp`
- Spotify tracks: resolved via oEmbed to title/artist then searched on YouTube
- You can extend `downloader.py` to add more providers

## Notes on Volume

Volume uses FFmpeg filters and applies when starting a track. Changing volume mid-track restarts the current track at the new level.

## Project Structure

```
requirements.txt
README.md
Dockerfile
.env.example
src/telegram_music_bot/__init__.py
src/telegram_music_bot/config.py
src/telegram_music_bot/downloader.py
src/telegram_music_bot/queue.py
src/telegram_music_bot/player.py
src/telegram_music_bot/handlers.py
src/telegram_music_bot/__main__.py
```

## Maintainer

- GitHub: https://github.com/strad-dev131
- Telegram: @EliteSid_Xd

## License

MIT License © 2025 strad-dev131