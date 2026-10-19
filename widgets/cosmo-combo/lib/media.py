#!/usr/bin/env python3
"""Local Now Playing adapter. Never sends listening data over the network."""
import hashlib
import json
import subprocess
import time
from pathlib import Path
import base64
from common import executable

root = Path(__file__).resolve().parent
result = {"now": int(time.time() * 1000)}
try:
    binary = executable('media-control')
    if not binary:
        raise OSError('media-control is not installed')
    response = subprocess.run(
        [binary, "get", "--now"],
        capture_output=True, text=True, timeout=3, check=True,
    )
    media = json.loads(response.stdout) or {}
    for key in ("title", "artist", "duration", "playing", "bundleIdentifier"):
        if key in media:
            result[key] = media[key]
    result["elapsed"] = media.get("elapsedTimeNow", media.get("elapsedTime", 0))
    artwork = media.get("artworkData")
    if artwork:
        decoded = base64.b64decode(artwork)
        digest = hashlib.sha256(decoded).hexdigest()[:16]
        stamp = root / "cover.sha256"
        if not stamp.exists() or stamp.read_text() != digest:
            (root / "cover.jpg").write_bytes(decoded)
            stamp.write_text(digest)
        result["artwork"] = digest
except (subprocess.SubprocessError, OSError, ValueError, TypeError):
    result["unavailable"] = True
print(json.dumps(result, ensure_ascii=False))
