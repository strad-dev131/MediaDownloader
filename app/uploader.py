from pathlib import Path
from typing import Optional

import httpx


def upload_to_catbox(file_path: str, userhash: Optional[str] = None) -> str:
    api_url = "https://catbox.moe/user/api.php"
    path = Path(file_path)

    with path.open("rb") as f:
        files = {"fileToUpload": (path.name, f)}
        data = {"reqtype": "fileupload"}
        if userhash:
            data["userhash"] = userhash

        resp = httpx.post(api_url, data=data, files=files, timeout=120)

    resp.raise_for_status()
    result = resp.text.strip()
    if result.startswith("https://"):
        return result
    raise RuntimeError(f"Catbox upload failed: {result}")