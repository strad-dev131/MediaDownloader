import re
from dataclasses import dataclass
from typing import Optional

import requests
from yt_dlp import YoutubeDL


YDL_OPTS = {
    "format": "bestaudio/best",
    "quiet": True,
    "nocheckcertificate": True,
    "ignoreerrors": True,
    "noplaylist": True,
    "default_search": "ytsearch",
    "geo_bypass": True,
    "cachedir": False,
}


@dataclass
class TrackInfo:
    title: str
    url: str  # direct media URL or page URL (used by ffmpeg)
    source: str  # e.g., "youtube", "spotify", "query"
    webpage_url: Optional[str] = None


YOUTUBE_RX = re.compile(r"(https?://)?(www\.)?(youtube\.com|youtu\.be)/", re.IGNORECASE)
SPOTIFY_TRACK_RX = re.compile(r"https?://open\.spotify\.com/track/([A-Za-z0-9]+)", re.IGNORECASE)


def _yt_search(query: str) -> Optional[TrackInfo]:
    """Search YouTube and return the first result."""
    with YoutubeDL(YDL_OPTS) as ydl:
        # ytsearch1:<query> returns one result
        info = ydl.extract_info(f"ytsearch1:{query}", download=False)
        if not info or "entries" not in info or not info["entries"]:
            return None
        entry = info["entries"][0]
        title = entry.get("title") or query
        webpage_url = entry.get("webpage_url") or entry.get("url")
        return TrackInfo(title=title, url=webpage_url, source="youtube", webpage_url=webpage_url)


def _yt_from_url(url: str) -> Optional[TrackInfo]:
    """Extract basic info from a YouTube URL."""
    with YoutubeDL(YDL_OPTS) as ydl:
        info = ydl.extract_info(url, download=False)
        if not info:
            return None
        title = info.get("title") or url
        webpage_url = info.get("webpage_url") or info.get("url") or url
        return TrackInfo(title=title, url=webpage_url, source="youtube", webpage_url=webpage_url)


def _spotify_to_query(url: str) -> Optional[str]:
    """Resolve a Spotify track URL to a title/artist via oEmbed (no API keys), then return a query string."""
    # https://open.spotify.com/oembed?url=<track_url>
    try:
        resp = requests.get("https://open.spotify.com/oembed", params={"url": url}, timeout=10)
        if resp.status_code != 200:
            return None
        data = resp.json()
        title = data.get("title")  # Usually "Track Name - Artist"
        return title
    except Exception:
        return None


def resolve_query_to_track(query_or_url: str) -> Optional[TrackInfo]:
    """
    Resolve a user query or URL to a TrackInfo suitable for ffmpeg playout.
    - YouTube links: use as-is
    - Spotify track links: convert to "Title - Artist" via oEmbed and search on YouTube
    - Plain text queries: search on YouTube
    """
    q = query_or_url.strip()

    # YouTube link
    if YOUTUBE_RX.search(q):
        return _yt_from_url(q)

    # Spotify track
    if SPOTIFY_TRACK_RX.search(q):
        title_query = _spotify_to_query(q)
        if not title_query:
            # Fallback: try to search by the URL itself
            return _yt_search(q)
        return _yt_search(title_query)

    # Plain query -> YouTube
    return _yt_search(q)