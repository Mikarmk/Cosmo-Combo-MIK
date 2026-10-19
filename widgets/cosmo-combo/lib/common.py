"""Local configuration and executable discovery for Intel and Apple Silicon Macs."""
import json
import os
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent

def configuration():
    try:
        value = json.loads((ROOT.parent / 'config.json').read_text())
        return value if isinstance(value, dict) else {}
    except (OSError, ValueError):
        return {}

def codex_enabled():
    return configuration().get('codex_enabled') is True

def codex_home():
    return Path(os.environ.get('CODEX_HOME', str(Path.home() / '.codex'))).expanduser()

def executable(name):
    found = shutil.which(name)
    if found:
        return found
    for directory in [Path.home()/'.npm-global/bin', Path.home()/'.local/bin', Path('/opt/homebrew/bin'), Path('/usr/local/bin'), Path('/usr/bin')]:
        candidate = directory / name
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return str(candidate)
    return None
