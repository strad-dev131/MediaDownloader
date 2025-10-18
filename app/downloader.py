import glob
import os
from pathlib import Path
from typing import Optional, Tuple

# Use env var DOWNLOAD_DIR if provided (for persistent disks on hosts like Render)
DEFAULT_DOWNLOAD_DIR = Path(__file__).resolve().parent.parent / "downloads"
DOWNLOAD_DIR = Path(os.getenv("DOWNLOAD_DIR", str(DEFAULT_DOWNLOAD_DIR)))
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _find_output_file(video_id: str, desired_ext: Optional[str]) -> Optional[Path]:
    pattern = str(DOWNLOAD_DIR / f"* [{video_id}].*")
    files = sorted(glob.glob(pattern))
    if desired_ext:
        for f in files:
            if f.lower().endswith(f".{desired_ext.lower()}"):
                return Path(f)
    return Path(files[-1]) if files else None


def download(url: str, media_format: str) -> Tuple[str, str]:
    if media_format not in {"mp4", "mp3"}:
        raise ValueError("Unsupported format. Use 'mp4' or 'mp3'.")

    try:
        from yt_dlp import YoutubeDL
    except Exception as e:
        raise RuntimeError("yt-dlp is not installed.") from e

    outtmpl = str(DOWNLOAD_DIR / "%(title)s [%(id)s].%(ext)s")
    ydl_opts = {
        "outtmpl": outtmpl,
        "restrictfilenames": True,
        "no_warnings": True,
        "noprogress": True,
        "quiet": True,
    }

    if media_format == "mp3":
        ydl_opts.update(
            {
                "format": "bestaudio/best",
                "postprocessors": [
                    {
                        "key": "FFmpegExtractAudio",
                        "preferredcodec": "mp3",
                        "preferredquality": "192",
                    }
                ],
            }
        )
    else:  # mp4
        ydl_opts.update(
            {
                "format": "bv*+ba/b",
                "merge_output_format": "mp4",
            }
        )

    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)

    video_id = info.get("id")
    if not video_id:
        raise RuntimeError("Could not determine media ID from the URL.")

    desired_ext = "mp3" if media_format == "mp3" else "mp4"
    output = _find_output_file(video_id, desired_ext)
    if not output:
        raise RuntimeError(
            "Download completed but output file not found. Check server logs."
        )

    return str(output.resolve()), output.name