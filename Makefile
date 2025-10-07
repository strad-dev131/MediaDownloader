.PHONY: install run docker-build docker-run fmt

install:
\tpython -m venv .venv
\t. .venv/bin/activate && pip install -r requirements.txt

run:
\t. .venv/bin/activate && python -m telegram_music_bot

docker-build:
\tdocker build -t telegram-music-bot .

docker-run:
\tdocker run --rm -it \
\t-e API_ID=$$API_ID \
\t-e API_HASH=$$API_HASH \
\t-e BOT_TOKEN=$$BOT_TOKEN \
\t-e ASSISTANT_ID=$$ASSISTANT_ID \
\ttelegram-music-bot