# Media Downloader (YouTube & Instagram → MP4/MP3)

A small FastAPI web app that lets you paste a YouTube or Instagram URL and download:
- MP4 (video)
- MP3 (audio only)

The backend uses `yt-dlp` and `ffmpeg`.

Important: This tool is for content you own or have explicit permission to download. You are responsible for complying with the platforms' Terms of Service and local laws.

## Quick Start (Local)

1) Install system dependency:
   - macOS: `brew install ffmpeg`
   - Debian/Ubuntu: `sudo apt-get update && sudo apt-get install -y ffmpeg`
   - Windows: Install from https://ffmpeg.org/download.html and ensure `ffmpeg` is on your PATH

2) Create and activate a Python environment (optional but recommended).

3) Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

4) Run the server:
   ```
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

5) Open the site in your browser:
   - http://localhost:8000

## Docker

Build:
```
docker build -t media-downloader .
```

Run:
```
docker run --rm -p 8000:8000 media-downloader
```

Open:
- http://localhost:8000

## Catbox Upload (Optional)

To get a public, shareable link hosted on Catbox:
- Tick "Upload to Catbox" on the form.
- Optionally paste your Catbox `userhash` to associate the upload with your account (anonymous uploads work without it).
- After download, the response will include `catbox_url` if the upload succeeded.

Catbox API docs: https://catbox.moe/tools.php

## Notes

- Output files are saved under `downloads/` and automatically served at `/downloads/<filename>`.
- Some Instagram posts (e.g., private accounts) require authentication that is not supported here.
- For YouTube, availability and formats depend on the source; `yt-dlp` selects the best combination and remuxes to MP4 for video, or extracts audio to MP3.

## Troubleshooting

- If MP3 or MP4 generation fails, verify `ffmpeg` is installed and on the PATH (the Docker image comes with ffmpeg installed).
- If you see "Download completed but output file not found", check server logs and confirm the platform supports the content type you're requesting.