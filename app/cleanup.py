import os
from datetime import datetime, timedelta
from pathlib import Path

DOWNLOAD_DIR = Path(os.getenv("DOWNLOAD_DIR", Path(__file__).resolve().parent.parent / "downloads"))

def cleanup(max_age_days: int = 7) -> int:
    """Delete files older than max_age_days from the downloads directory."""
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    cutoff = datetime.utcnow() - timedelta(days=max_age_days)
    removed = 0
    for p in DOWNLOAD_DIR.glob("*"):
        try:
            mtime = datetime.utcfromtimestamp(p.stat().st_mtime)
            if mtime < cutoff and p.is_file():
                p.unlink()
                removed += 1
        except Exception:
            # skip problematic files without failing the whole cleanup
            pass
    return removed

if __name__ == "__main__":
    days = int(os.getenv("MAX_AGE_DAYS", "7"))
    count = cleanup(days)
    print(f"Removed {count} files older than {days} days from {DOWNLOAD_DIR}")