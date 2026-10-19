#!/usr/bin/env python3
import fcntl
import json
import os
from pathlib import Path
import subprocess
import time
from focus import snapshot,read
from common import codex_enabled
ROOT=Path(__file__).resolve().parent

def load(name):
    try:return json.loads((ROOT/name).read_text())
    except (OSError,ValueError):return {}

# A single media poll shared by both displays; clock always uses current wall time.
media_path=ROOT/'media-cache.json'
try:
    with (ROOT/'media.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX)
        if not media_path.exists() or time.time()-media_path.stat().st_mtime>1.8:
            try:
                raw=subprocess.run(['/usr/bin/python3',str(ROOT/'media.py')],capture_output=True,text=True,timeout=4,check=True)
                media=json.loads(raw.stdout)
                tmp=media_path.with_name(media_path.name+'.tmp');tmp.write_text(json.dumps(media));os.replace(tmp,media_path)
            except (subprocess.SubprocessError,OSError,ValueError):pass
except OSError:pass
result=load('media-cache.json')
result['features']={'codex':codex_enabled()}
result['now']=int(time.time()*1000)
result['focus']=snapshot(read())
result['bluetooth']=load('bluetooth-cache.json')
result['codex']=load('codex-cache.json')
result['tasks']=load('tasks-cache.json')
try:
    if not (ROOT/'collector.stamp').exists() or time.time()-(ROOT/'collector.stamp').stat().st_mtime>5:
        subprocess.Popen(['/usr/bin/python3',str(ROOT/'collector.py')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True)
except OSError:pass
print(json.dumps(result,ensure_ascii=False))
