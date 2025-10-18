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

## Deploy on Render (Free)

This repo includes `render.yaml` and a `Dockerfile` for a one-click Render deployment.

Steps:
1) Push this repo to your GitHub account.
2) Go to https://render.com, create an account, and click "New +" → "Blueprint".
3) Connect your repo containing this project.
4) Render will read `render.yaml` and create a Web Service using the Dockerfile.
5) Health check: `/health` (already configured).
6) Wait for the build to complete; copy the service URL (e.g., `https://media-downloader.onrender.com`).

Now:
- Open the static site (e.g., the one deployed earlier), and pass your backend URL:
  ```
  https://k9gqoykybmw4.cosine.page/?api=https://media-downloader.onrender.com
  ```
- Or serve the static files from the same backend by visiting:
  ```
  https://media-downloader.onrender.com
  ```
  (Static files are mounted at `/` in the FastAPI app.)

## Using a Static Frontend with a Remote API

If you host `static/` on a static site (no backend), point it at your running API via a query param:

```
https://your-static-site.example.com/?api=https://your-backend.example.com
```

The frontend will send requests to `https://your-backend.example.com/api/...`.  
CORS is enabled server-side for simplicity, but you can restrict origins in `app/main.py`.

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