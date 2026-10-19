#!/usr/bin/env python3
"""Read-only, rate-limited collectors. No keys/tokens or conversation text in cache."""
import fcntl
import json
import os
import selectors
import sqlite3
import subprocess
import time
from pathlib import Path
from common import codex_enabled, codex_home, executable
ROOT=Path(__file__).resolve().parent

def write(name,data):
    path=ROOT/name
    tmp=path.with_name(path.name+f'.{os.getpid()}.tmp')
    tmp.write_text(json.dumps(data,ensure_ascii=False))
    os.replace(tmp,path)

def cached(name,age):
    try:return time.time()-(ROOT/name).stat().st_mtime < age
    except OSError:return False

def tasks():
    db=codex_home()/'state_5.sqlite'
    result={'updatedAt':time.time(),'available':False,'active':[]}
    try: index=json.loads((ROOT/'tasks-index.json').read_text())
    except (OSError,ValueError): index={}
    next_index={}
    try:
        with sqlite3.connect('file:'+str(db)+'?mode=ro',uri=True,timeout=1) as conn:
            columns={row[1] for row in conn.execute('pragma table_info(threads)')}
            title='coalesce(name,title)' if 'name' in columns else 'title'
            rows=conn.execute(f'select id,{title},rollout_path from threads where archived=0 order by updated_at desc limit 40').fetchall()
        for thread_id,name,rollout in rows:
            path=Path(rollout)
            if not path.exists() or time.time()-path.stat().st_mtime>86400:
                continue
            stat=path.stat()
            previous=index.get(str(path),{})
            last=previous.get('last')
            offset=previous.get('size',0)
            if offset>stat.st_size:offset=0;last=None
            if offset!=stat.st_size or previous.get('mtime')!=stat.st_mtime_ns:
                with path.open('rb') as f:
                    f.seek(offset)
                    for line in f:
                        if b'"event_msg"' not in line or not any(kind in line for kind in (b'task_started',b'task_complete',b'task_failed',b'turn_aborted')):continue
                        try:
                            event=json.loads(line)
                            kind=event.get('payload',{}).get('type')
                            if kind in ('task_started','task_complete','task_failed','turn_aborted'):
                                last=kind
                        except (ValueError,TypeError):pass
            next_index[str(path)]={'size':stat.st_size,'mtime':stat.st_mtime_ns,'last':last}
            if last=='task_started':
                # name is the app's thread title; never copy message bodies.
                label=name if name and '\n' not in name and len(name)<180 else 'Codex task'
                result['active'].append({'id':thread_id,'title':label})
        result['available']=True
    except (sqlite3.Error,OSError):pass
    write('tasks-cache.json',result)
    write('tasks-index.json',next_index)

def bluetooth():
    data={'updatedAt':time.time(),'available':False,'devices':[]}
    try:
        proc=subprocess.run(['/usr/sbin/system_profiler','SPBluetoothDataType','-json'],capture_output=True,text=True,timeout=12,check=True)
        raw=json.loads(proc.stdout)
        for controller in raw.get('SPBluetoothDataType',[]):
            for device in controller.get('device_connected',[]):
                for name,props in device.items():
                    batteries=[]
                    for key,value in props.items():
                        if 'battery' in key.lower():
                            try:
                                number=int(str(value).replace('%','').strip())
                                if 0<=number<=100:
                                    part='L' if 'left' in key.lower() else 'R' if 'right' in key.lower() else 'Case' if 'case' in key.lower() else ''
                                    batteries.append({'part':part,'percent':number})
                            except (ValueError,TypeError):pass
                    data['devices'].append({'name':name,'batteries':batteries})
        data['available']=True
    except (subprocess.SubprocessError,OSError,ValueError):pass
    write('bluetooth-cache.json',data)

def limits():
    p=None
    try:
        binary=executable('codex')
        if not binary:
            raise OSError('Codex CLI not installed')
        p=subprocess.Popen([binary,'app-server'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,bufsize=1,env={**os.environ,'PATH':'/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin'})
        sel=selectors.DefaultSelector();sel.register(p.stdout,selectors.EVENT_READ)
        def call(number,method,params=None):
            p.stdin.write(json.dumps({'id':number,'method':method,'params':params or {}})+'\n');p.stdin.flush()
            until=time.time()+12
            while time.time()<until:
                if not sel.select(max(0,until-time.time())):break
                line=p.stdout.readline()
                if not line:break
                msg=json.loads(line)
                if msg.get('id')==number:
                    if 'error' in msg:raise RuntimeError('Unavailable')
                    return msg['result']
            raise RuntimeError('Timeout')
        call(0,'initialize',{'clientInfo':{'name':'desktop_focus_widget','version':'1.0.0'}})
        p.stdin.write('{"method":"initialized","params":{}}\n');p.stdin.flush()
        result=call(1,'account/rateLimits/read')
        buckets=result.get('rateLimitsByLimitId') or {'codex':result.get('rateLimits')}
        windows=[]
        for key,bucket in buckets.items():
            if not bucket:continue
            for field in ['primary','secondary']:
                window=bucket.get(field)
                if window and window.get('usedPercent') is not None:
                    windows.append({'bucket':key,'usedPercent':window['usedPercent'],'windowMinutes':window.get('windowDurationMins'),'resetsAt':window.get('resetsAt')})
        write('codex-cache.json',{'updatedAt':time.time(),'available':bool(windows),'windows':windows})
    except (OSError,ValueError,RuntimeError,subprocess.SubprocessError):
        # Retain the last successful result with its original timestamp; UI marks it stale.
        if not (ROOT/'codex-cache.json').exists():
            write('codex-cache.json',{'updatedAt':time.time(),'available':False,'windows':[]})
    finally:
        if p:
            p.terminate()
            try:p.wait(timeout=2)
            except subprocess.TimeoutExpired:p.kill();p.wait()

if __name__=='__main__':
    with (ROOT/'collector.lock').open('a') as lock:
        try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError:raise SystemExit(0)
        (ROOT/'collector.stamp').touch()
        if codex_enabled():
            tasks()
        if not cached('bluetooth-cache.json',60):bluetooth()
        if codex_enabled() and not cached('limits-attempt.stamp',300):
            (ROOT/'limits-attempt.stamp').touch()
            limits()
