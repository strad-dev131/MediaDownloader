from pathlib import Path
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .downloader import download
from .uploader import upload_to_catbox

app = FastAPI(title="Media Downloader")

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"
DOWNLOADS_DIR = BASE_DIR / "downloads"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
app.mount("/downloads", StaticFiles(directory=str(DOWNLOADS_DIR)), name="downloads")


class DownloadRequest(BaseModel):
    url: str
    format: Literal["mp4", "mp3"]
    agree: bool
    upload_to_catbox: Optional[bool] = False
    catbox_userhash: Optional[str] = None


@app.get("/", response_class=HTMLResponse)
def root():
    return (STATIC_DIR / "index.html").read_text(encoding="utf-8")


@app.post("/api/download")
def api_download(req: DownloadRequest):
    if not req.agree:
        raise HTTPException(
            status_code=400,
            detail="You must confirm you have rights to download this content.",
        )
    try:
        file_path, filename = download(req.url, req.format)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    response = {"download_url": f"/downloads/{filename}", "filename": filename}

    if req.upload_to_catbox:
        try:
            catbox_url = upload_to_catbox(file_path, req.catbox_userhash)
            response["catbox_url"] = catbox_url
        except Exception as e:
            # Return the local download link regardless; include upload error
            response["catbox_error"] = str(e)

    return response


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)