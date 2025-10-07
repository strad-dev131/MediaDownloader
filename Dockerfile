# syntax=docker/dockerfile:1

FROM python:3.11-slim

LABEL org.opencontainers.image.title="Telegram Voice Chat Music Bot"
LABEL org.opencontainers.image.description="A professional Telegram music bot that joins voice chats and plays songs."
LABEL org.opencontainers.image.source="https://github.com/strad-dev131"
LABEL maintainer="@EliteSid_Xd"

# Install ffmpeg and runtime deps
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy source
COPY src /app/src
COPY README.md /app/README.md

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app/src

# Credentials should be passed via environment variables:
# API_ID, API_HASH, BOT_TOKEN, ASSISTANT_ID
CMD ["python", "-m", "telegram_music_bot"]