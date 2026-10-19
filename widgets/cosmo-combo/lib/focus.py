#!/usr/bin/env python3
"""Shared clock state for every display. No background countdown drift."""
import argparse
import fcntl
import json
import math
import os
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
STATE = ROOT / 'focus-state.json'
PRESETS = (15, 30, 45, 60)

def read(path=STATE):
    try:
        data = json.loads(Path(path).read_text())
        if not isinstance(data, dict):
            raise ValueError('state must be an object')
        if data.get('minutes', 30) not in PRESETS:
            data['minutes'] = 30
        if data.get('mode') not in ('idle', 'focus', 'break'):
            raise ValueError('mode')
        return data
    except (OSError, ValueError, TypeError):
        return {'mode': 'idle', 'minutes': 30}

def snapshot(data, now=None):
    now = time.time() if now is None else now
    mode = data.get('mode', 'idle')
    minutes = data.get('minutes', 30)
    if minutes not in PRESETS:
        minutes = 30
    result = {'phase': mode, 'minutes': minutes, 'progress': 0, 'remaining': minutes * 60}
    if mode in ('focus', 'break'):
        try:
            started = float(data['startedAt'])
            duration = float(data['duration'])
            if duration <= 0 or not math.isfinite(started + duration):
                raise ValueError('duration')
        except (KeyError, TypeError, ValueError):
            return {'phase':'idle','minutes':minutes,'progress':0,'remaining':minutes*60}
        elapsed = max(0, now - started)
        result.update(progress=min(1, elapsed / duration), remaining=max(0, math.ceil(duration-elapsed)), duration=duration, startedAt=started)
        if elapsed >= duration:
            result['phase'] = 'breakReady' if mode == 'focus' else 'complete'
    return result

def mutate(action, value=None, path=STATE, now=None):
    path = Path(path)
    now = time.time() if now is None else now
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.with_suffix('.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        data = read(path)
        minutes = data.get('minutes', 30)
        if action == 'select':
            if value not in PRESETS:
                raise ValueError('Choose 15, 30, 45 or 60 minutes')
            if snapshot(data, now)['phase'] == 'idle':
                data = {'mode':'idle','minutes':value}
        elif action == 'start':
            minutes = value if value is not None else minutes
            if minutes not in PRESETS:
                raise ValueError('Invalid focus duration')
            data = {'mode':'focus','minutes':minutes,'startedAt':now,'duration':minutes*60}
        elif action == 'stop':
            data = {'mode':'idle','minutes':minutes}
        elif action == 'break':
            data = {'mode':'break','minutes':minutes,'startedAt':now,'duration':300}
        else:
            raise ValueError('Invalid action')
        tmp = path.with_name(path.name + f'.{os.getpid()}.tmp')
        tmp.write_text(json.dumps(data))
        os.replace(tmp,path)
    return snapshot(data, now)

def launch_overlay():
    binary = ROOT / 'FocusPerimeter.app/Contents/MacOS/FocusPerimeter'
    if binary.exists():
        subprocess.Popen([str(binary),str(STATE),str(ROOT/'Tektur.ttf')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True)

if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('action',choices=['status','select','start','stop','break'])
    parser.add_argument('minutes',nargs='?',type=int)
    parser.add_argument('--state',type=Path,default=STATE)
    args=parser.parse_args()
    state=snapshot(read(args.state)) if args.action=='status' else mutate(args.action,args.minutes,args.state)
    if args.state==STATE and args.action in ('start','break'):
        launch_overlay()
    print(json.dumps(state))
