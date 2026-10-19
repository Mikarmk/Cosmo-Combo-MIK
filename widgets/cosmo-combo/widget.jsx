import { run } from 'uebersicht';

// Cosmo Combo MIK: a wallpaper-first desktop clock, player and focus timer.
// Local desktop integration; no wallpaper changes.
const ROOT = '$HOME/Library/Application Support/Übersicht/widgets/cosmo-combo';
export const command = `/usr/bin/python3 "${ROOT}/lib/dashboard.py"`;
export const refreshFrequency = 1000;
export const initialState = { data: {}, error: '' };
export const updateState = (event, state) => {
  if (event.error) return { ...state, error: 'Could not complete this action' };
  try { return { data: JSON.parse(event.output), error: '' }; }
  catch (_) { return state; }
};
const paths = {
  stop: 'M6 6h12v12H6z',
  bluetooth: 'M11 1l7 6-5 5 5 5-7 6V14l-5 5-1.4-1.4 5.6-5.6L4.6 6.4 6 5l5 5V1z M13 5.3v4.3L15.6 7z M13 14.4v4.3l2.6-1.7z',
  play: 'M8 5v14l11-7z',
  pause: 'M7 5h3v14H7z M14 5h3v14h-3z',
  next: 'M5 5v14l10-7z M17 5h2v14h-2z',
  previous: 'M19 5v14L9 12z M5 5h2v14H5z',
  youtube: 'M21.6 7.2a2.8 2.8 0 0 0-2-2C17.9 4.8 12 4.8 12 4.8s-5.9 0-7.6.4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2 12a29 29 0 0 0 .4 4.8 2.8 2.8 0 0 0 2 2c1.7.4 7.6.4 7.6.4s5.9 0 7.6-.4a2.8 2.8 0 0 0 2-2A29 29 0 0 0 22 12a29 29 0 0 0-.4-4.8z M10 15.2V8.8l5.5 3.2z',
  gpt: 'M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-7l-6 4v-4H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M5 6v9h4v2l3-2h7V6z',
  pinterest: 'M12 2a10 10 0 0 0-3.64 19.31c-.03-.8 0-1.77.2-2.63l1.28-5.41s-.32-.65-.32-1.61c0-1.51.88-2.64 1.97-2.64.93 0 1.38.7 1.38 1.54 0 .94-.6 2.34-.9 3.64-.26 1.09.55 1.98 1.63 1.98 1.96 0 3.29-2.52 3.29-5.51 0-2.27-1.53-3.97-4.32-3.97-3.15 0-5.11 2.35-5.11 4.97 0 .9.27 1.54.7 2.03.2.24.23.34.16.62l-.23.91c-.07.29-.3.4-.55.3-1.44-.59-2.11-2.16-2.11-3.92 0-2.92 2.46-6.42 7.34-6.42 3.92 0 6.5 2.84 6.5 5.88 0 4.02-2.24 7.03-5.54 7.03-1.11 0-2.15-.6-2.51-1.28l-.69 2.73c-.25.9-.73 1.81-1.17 2.51A10 10 0 1 0 12 2z',
  cloud: 'M1 12h1v5H1z M3 10h1v8H3z M5 8h1v10H5z M7 7h1v11H7z M9 6h1v12H9z M11 6.4a6 6 0 0 1 9 4.6 3.5 3.5 0 1 1 .5 7H11z',
};
const Icon = ({name}) => name==='gpt' ? <img className="brand-icon" src="cosmo-combo/lib/chatgpt.svg" alt="" aria-hidden="true"/> : <svg viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d={paths[name]}/></svg>;
const act = (name, dispatch) => run(`/usr/bin/python3 "${ROOT}/lib/control.py" ${name}`)
  .then(() => run(command)).then(output => dispatch({output})).catch(() => dispatch({error:true}));
const services = [
  {name:'ChatGPT',icon:'gpt',url:'https://chatgpt.com/'},
  {name:'Pinterest',icon:'pinterest',url:'https://www.pinterest.com/'},
  {name:'YouTube',icon:'youtube',url:'https://www.youtube.com/'},
  {name:'SoundCloud',icon:'cloud',url:'https://soundcloud.com/'},
];
const taskUrl = id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id)) ? `codex://threads/${id}` : '';
const openTask = (id,dispatch) => { const url=taskUrl(id); if(url)run(`/usr/bin/open '${url}'`).catch(()=>dispatch({error:true})); };
const timerAction = (action,dispatch,value='') => run(`/usr/bin/python3 "${ROOT}/lib/focus.py" ${action} ${value}`)
  .then(()=>run(command)).then(output=>dispatch({output})).catch(()=>dispatch({error:true}));
const stamp = n => `${String(Math.floor(Math.max(0,n||0)/60)).padStart(2,'0')}:${String(Math.floor(Math.max(0,n||0)%60)).padStart(2,'0')}`;
const windowLabel = n => n>=10080?'7 days':n>=1440?`${Math.round(n/1440)} d`:n>=60?`${Math.round(n/60)} h`:`${n} min`;
export const render = ({data,error},dispatch) => {
  const now = new Date(data.now || Date.now());
  const timeParts = now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).split(':');
  const focus = data.focus || {phase:'idle',minutes:30,remaining:1800};
  const idle = focus.phase==='idle';
  const breakReady = focus.phase==='breakReady';
  const complete = focus.phase==='complete';
  const hasTrack=Boolean(data.title);
  const duration=Math.max(0,Number(data.duration)||0);
  const elapsed=Math.max(0,Math.min(duration,Number(data.elapsed)||0));
  const progress=duration>0?elapsed/duration*100:0;
  const seek=position=>{if(duration>0)act(`seek ${Math.max(0,Math.min(duration,position)).toFixed(2)}`,dispatch);};
  const bt=data.bluetooth||{};
  const devices=bt.devices||[];
  const codex=data.codex||{};
  const codexEnabled=Boolean(data.features&&data.features.codex);
  const staleLimits = !codex.updatedAt || now.getTime()/1000-codex.updatedAt>900;
  const windows=codex.windows||[];
  const taskState=data.tasks||{};
  const tasks=taskState.active||[];
  const staleTasks=!taskState.updatedAt || now.getTime()/1000-taskState.updatedAt>30;
  return <main className="desktop-stack" aria-label="Clock, music and focus">
    <section className="clock" aria-label="Clock and date">
      <time className="time" dateTime={now.toISOString()} aria-label={timeParts.join(':')}>
        <span>{timeParts[0]}</span><span className="colon">:</span><span>{timeParts[1]}</span><span className="seconds"><span>:</span>{timeParts[2]}</span>
      </time>
      <div className="day">{now.toLocaleDateString('en-GB',{weekday:'long'}).toLocaleUpperCase('en-GB')}</div>
      <div className="date">{now.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}).toLocaleUpperCase('en-GB')}</div>
    </section>
    <section className="player" aria-label="Music player">
      <div className="player-row">
        {data.artwork?<img className="artwork" src={`cosmo-combo/lib/cover.jpg?v=${data.artwork}`} alt=""/>:null}
        <div className="track" key={data.title||'empty'} title={hasTrack?`${data.title}${data.artist?' — '+data.artist:''}`:'Nothing playing'}>
          <span className="track-title">{data.title||'Nothing playing'}</span>
          <span className="artist">{data.artist||'Play something in your music app'}</span>
        </div>
        <div className="transport">
          <button disabled={!hasTrack} aria-label="Previous track" title="Previous track" onClick={()=>act('previous-track',dispatch)}><Icon name="previous"/></button>
          <button disabled={!hasTrack} className="play" aria-label={data.playing?'Pause':'Play'} title={data.playing?'Pause':'Play'} onClick={()=>act('toggle-play-pause',dispatch)}><Icon name={data.playing?'pause':'play'}/></button>
          <button disabled={!hasTrack} aria-label="Next track" title="Next track" onClick={()=>act('next-track',dispatch)}><Icon name="next"/></button>
        </div>
      </div>
      <div className="progress" role="slider" tabIndex={duration>0?0:-1} aria-label="Track position" aria-valuemin={0} aria-valuemax={duration} aria-valuenow={elapsed} aria-valuetext={`${stamp(elapsed)} of ${stamp(duration)}`} aria-disabled={duration<=0} title={duration>0?`${stamp(elapsed)} / ${stamp(duration)}`:'No active track'} onClick={event=>{const rect=event.currentTarget.getBoundingClientRect();seek((event.clientX-rect.left)/rect.width*duration);}} onKeyDown={event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();seek(event.key==='Home'?0:event.key==='End'?duration:elapsed+(event.key==='ArrowRight'?5:-5));}}}>
        <div className="progress-rail"><span style={{width:`${progress}%`}}><i/></span></div>
      </div>
      <div className="track-times"><span>{stamp(elapsed)}</span><span>{stamp(duration)}</span></div>
    </section>
    <nav className="services" aria-label="Quick links">
      {services.map(service=><a key={service.name} href={service.url} title={`Open ${service.name}`} aria-label={`Open ${service.name}`} onClick={event=>{event.preventDefault();run(`/usr/bin/open '${service.url}'`).catch(()=>dispatch({error:true}));}}><Icon name={service.icon}/></a>)}
    </nav>
    <section className={`pomodoro phase-${focus.phase}`} aria-label="Pomodoro">
      <div className="focus-heading"><span className="micro-label">{breakReady?'TIME FOR A BREAK':complete?'BREAK COMPLETE':focus.phase==='break'?'BREAK':'FOCUS'}</span><span className="focus-caption">{idle?'Break · 5 min':focus.phase==='focus'?`${Math.round(focus.progress*100)}%`:' '}</span></div>
      <div className="focus-main">
        <span className="focus-time">{stamp(breakReady?300:focus.remaining)}</span>
        <div className="focus-actions">
          {idle?<button className="start-focus" onClick={()=>timerAction('start',dispatch)}><Icon name="play"/><span>Start</span></button>:breakReady?<button className="start-focus" onClick={()=>timerAction('break',dispatch)}><Icon name="play"/><span>Break · 5 min</span></button>:complete?<button className="start-focus" onClick={()=>timerAction('stop',dispatch)}><span>New focus</span></button>:null}
          {!idle?<button className="stop-focus" aria-label="Stop Pomodoro" title="Stop Pomodoro" onClick={()=>timerAction('stop',dispatch)}><Icon name="stop"/></button>:null}
        </div>
      </div>
      <div className="presets" role="group" aria-label="Focus duration">
        {[15,30,45,60].map(minutes=><button key={minutes} disabled={!idle} aria-pressed={focus.minutes===minutes} aria-label={`${minutes} minutes`} onClick={()=>timerAction('select',dispatch,minutes)}>{minutes}<span>min</span></button>)}
      </div>
      {error?<div className="action-error" role="status">{error}</div>:null}
    </section>
    <section className={`telemetry ${codexEnabled?'':'without-codex'}`} aria-label="Devices and Codex">
      <div className="device-status">
        <div className="micro-label status-heading"><Icon name="bluetooth"/><span>DEVICES</span></div>
        {!bt.available?<p className="muted">Data unavailable</p>:devices.length===0?<p className="muted">No devices connected</p>:devices.slice(0,3).map(device=><div className="device" key={device.name}><span className="device-name" title={device.name}>{device.name}</span><span className="device-battery" title={device.batteries.length?'Battery reported by macOS':'Battery level not reported'}>{device.batteries.length?device.batteries.map(b=>`${b.part?b.part+' ':''}${b.percent}%`).join(' · '):'—'}</span></div>)}
      </div>
      {codexEnabled?<div className="codex-status">
        <div className="micro-label status-heading"><Icon name="gpt"/><span>CODEX</span></div>
        {codex.available&&!staleLimits?windows.slice(0,2).map((window,index)=>{
          const remaining=Math.max(0,100-window.usedPercent);
          return <div className="quota" key={`${window.bucket}-${index}`} title={`Remaining ${remaining}%. Resets: ${window.resetsAt?new Date(window.resetsAt*1000).toLocaleString('en-GB'):'not available'}. Updated: ${new Date(codex.updatedAt*1000).toLocaleTimeString('en-GB')}`}><div className="quota-copy"><span>{windowLabel(window.windowMinutes)}</span><span><strong>{remaining}%</strong> remaining</span></div><div className="quota-rail"><i style={{width:`${remaining}%`}}/></div></div>;
        }):<p className="muted">{staleLimits&&codex.available?'Data is out of date':'Limits unavailable'}</p>}
      </div>:null}
      {codexEnabled?<div className="task-status" title="Local Codex lifecycle events; refreshed every 5 seconds">
        <span className={`task-dot ${tasks.length&&!staleTasks?'active':''}`}/>
        <div>{staleTasks||!taskState.available?<span className="muted">Task status unavailable</span>:tasks.length?<div className="active-tasks"><span className="task-caption">Running · {tasks.length}</span>{tasks.slice(0,2).map(task=><a className="task-name" key={task.id} href={taskUrl(task.id)||undefined} title={`Open chat: ${task.title}`} aria-label={`Open chat ${task.title}`} onClick={event=>{event.preventDefault();openTask(task.id,dispatch);}}><span>{task.title}</span><span className="task-arrow" aria-hidden="true">↗</span></a>)}</div>:<span className="muted">No active tasks</span>}</div>
      </div>:null}
    </section>
  </main>;
};
export const className = `
  @font-face { font-family:'Tektur'; src:url('cosmo-combo/lib/Tektur.ttf') format('truetype'); font-weight:400 900; font-style:normal; font-display:swap; }
  top:clamp(48px,7vh,96px);
  left:clamp(24px,6vw,220px);
  width:min(600px,calc(100vw - 48px));
  color:#fbf9f2; text-align:center;
  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
  -webkit-font-smoothing:antialiased; user-select:none; pointer-events:none;
  .desktop-stack { display:flex; flex-direction:column; align-items:center; }
  .clock { font-family:'Tektur','Helvetica Neue',sans-serif; }
  .time { display:flex; align-items:baseline; justify-content:center; font-size:clamp(72px,7.6vw,128px); font-weight:500; line-height:1; font-variant-numeric:tabular-nums; letter-spacing:-.025em; }
  .colon { margin:0 .025em; opacity:.8; }
  .seconds { font-size:.48em; margin-left:.13em; letter-spacing:.01em; }
  .seconds>span { opacity:.65; margin-right:.06em; }
  .day { margin-top:17px; font-size:clamp(14px,1.45vw,21px); font-weight:500; letter-spacing:.24em; line-height:1.3; padding-left:.24em; white-space:nowrap; }
  .date { font-size:11px; font-weight:400; letter-spacing:.2em; line-height:1.4; opacity:.9; margin-top:7px; }
  .player,.pomodoro,.telemetry { width:min(420px,calc(100vw - 56px)); box-sizing:border-box; pointer-events:auto; }
  .player { margin-top:28px; }
  .player-row { display:flex; align-items:center; gap:12px; }
  .artwork { width:38px; height:38px; object-fit:cover; border-radius:7px; flex-shrink:0; opacity:.9; }
  .track { flex:1; min-width:0; text-align:left; animation:track-arrive .2s ease; }
  .track-title { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; font-weight:500; line-height:19px; }
  .artist { display:block; margin-top:3px; font-size:11px; opacity:.8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; line-height:15px; }
  .transport { display:flex; gap:2px; align-items:center; flex-shrink:0; }
  button { display:flex; align-items:center; justify-content:center; color:inherit; font:inherit; border:0; padding:0; background:transparent; cursor:pointer; transition:opacity .18s,transform .18s,background .18s; }
  button:hover:not(:disabled) { opacity:1; }
  button:active:not(:disabled) { transform:scale(.94); }
  button:disabled { opacity:.25; cursor:default; }
  .transport button { width:30px; height:34px; opacity:.8; border-radius:50%; }
  .transport button:hover:not(:disabled) { background:#ffffff12; }
  .transport svg { width:14px; height:14px; }
  .transport .play { opacity:1; }
  .transport .play svg { width:19px; height:19px; }
  svg { fill:currentColor; }
  .progress { position:relative; height:20px; margin-top:7px; display:flex; align-items:center; cursor:pointer; }
  .progress[aria-disabled="true"] { cursor:default; }
  .progress-rail { width:100%; height:2px; border-radius:2px; background:#fbf9f240; }
  .progress-rail span { position:relative; height:100%; display:block; background:currentColor; border-radius:inherit; }
  .progress-rail i { position:absolute; right:-3px; top:-2px; width:6px; height:6px; border-radius:50%; background:currentColor; opacity:0; transition:opacity .18s; }
  .progress:hover .progress-rail i,.progress:focus-visible .progress-rail i { opacity:1; }
  .track-times { display:flex; justify-content:space-between; font-size:9px; font-variant-numeric:tabular-nums; opacity:.55; margin-top:-2px; }
  .services { display:flex; align-items:center; justify-content:center; gap:16px; margin-top:13px; pointer-events:auto; flex-wrap:wrap; max-width:100%; }
  .services a { display:grid; place-items:center; width:34px; height:34px; color:inherit; opacity:.74; text-decoration:none; transition:opacity .18s,transform .18s; border-radius:50%; }
  .services a:hover { opacity:1; transform:translateY(-2px); }
  .services a:active { transform:scale(.92); }
  .services svg,.services .brand-icon { width:19px; height:19px; object-fit:contain; }
  .pomodoro { margin-top:22px; padding-top:20px; border-top:1px solid #ffffff25; text-align:left; }
  .focus-heading { display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .micro-label { font-family:'Tektur',sans-serif; font-size:10px; letter-spacing:.15em; font-weight:500; line-height:1.3; }
  .focus-caption { font-size:10px; opacity:.8; }
  .focus-main { display:flex; justify-content:space-between; align-items:center; margin-top:8px; gap:15px; }
  .focus-time { font-family:'Tektur',sans-serif; font-size:39px; font-weight:400; line-height:1.15; font-variant-numeric:tabular-nums; letter-spacing:.02em; }
  .focus-actions { display:flex; align-items:center; gap:10px; }
  .start-focus { gap:7px; padding:9px 12px; border:1px solid #ffffff50; border-radius:9px; font-size:11px; min-height:34px; }
  .start-focus:hover { background:#ffffff14; }
  .start-focus svg { width:12px; height:12px; }
  .stop-focus { width:34px; height:34px; border:1px solid #ffffff50; border-radius:9px; }
  .stop-focus:hover { background:#ffffff14; }
  .stop-focus svg { width:12px; height:12px; }
  .presets { display:flex; gap:20px; align-items:center; margin-top:14px; }
  .presets button { position:relative; padding:0 0 7px; gap:4px; font-family:'Tektur',sans-serif; font-size:13px; opacity:.5; }
  .presets button span { font-family:'Helvetica Neue',sans-serif; font-size:9px; }
  .presets button[aria-pressed="true"] { opacity:1; }
  .presets button[aria-pressed="true"]:after { content:''; position:absolute; bottom:0; left:0; right:0; height:1px; background:currentColor; }
  .presets button:disabled { opacity:.23; }
  .presets button:disabled[aria-pressed="true"] { opacity:.65; }
  .phase-breakReady .micro-label,.phase-complete .micro-label { letter-spacing:.1em; }
  .telemetry { display:grid; grid-template-columns:1fr 1fr; column-gap:25px; row-gap:16px; text-align:left; margin-top:24px; padding-top:19px; border-top:1px solid #ffffff25; }
  .without-codex { grid-template-columns:1fr; }
  .status-heading { display:flex; align-items:center; gap:6px; opacity:.8; }
  .status-heading svg,.status-heading img { width:12px; height:12px; object-fit:contain; }
  .muted { opacity:.8; font-size:11px; margin:8px 0 0; line-height:1.5; }
  .device { display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:10px; margin-top:8px; }
  .device-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .device-battery { font-variant-numeric:tabular-nums; flex-shrink:0; font-size:10px; }
  .quota { margin-top:8px; }
  .quota-copy { display:flex; justify-content:space-between; gap:7px; font-size:10px; }
  .quota-copy>span:first-child { opacity:.75; }
  .quota-copy strong { font-weight:500; font-variant-numeric:tabular-nums; }
  .quota-rail { height:1px; background:#ffffff30; margin-top:7px; }
  .quota-rail i { display:block; height:100%; background:currentColor; opacity:.8; }
  .task-status { grid-column:1/-1; display:flex; gap:8px; align-items:baseline; }
  .task-status>div { min-width:0; }
  .task-dot { width:4px; height:4px; border-radius:50%; background:currentColor; opacity:.35; flex-shrink:0; }
  .task-dot.active { opacity:.9; animation:activity 1.8s ease-in-out infinite alternate; }
  .task-caption { font-size:10px; opacity:.8; }
  .task-name { display:flex; align-items:center; gap:7px; min-height:25px; color:inherit; text-decoration:none; font-size:11px; line-height:1.5; margin-top:2px; cursor:pointer; }
  .task-name>span:first-child { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .task-arrow { flex-shrink:0; opacity:.55; transition:opacity .18s,transform .18s; }
  .task-name:hover>span:first-child { text-decoration:underline; text-underline-offset:3px; }
  .task-name:hover .task-arrow { opacity:1; transform:translate(1px,-1px); }
  .action-error { font-size:10px; margin-top:9px; }
  button:focus-visible,a:focus-visible,.progress:focus-visible { outline:1px solid currentColor; outline-offset:3px; }
  @keyframes activity { to { opacity:.35; } }
  @keyframes track-arrive { from { opacity:.4; } to { opacity:1; } }
  @media (min-aspect-ratio:2/1) and (min-width:1600px) {
    top:clamp(70px,8vh,115px);
    .player,.pomodoro,.telemetry { width:460px; }
    .time { font-size:138px; }
    .player { margin-top:34px; }
  }
  @media (max-height:800px) {
    top:40px;
    .time { font-size:88px; }
    .day { margin-top:11px; font-size:15px; }
    .date { margin-top:5px; }
    .player { margin-top:20px; }
    .pomodoro { margin-top:15px; padding-top:15px; }
    .telemetry { margin-top:17px; padding-top:15px; row-gap:10px; }
    .focus-time { font-size:32px; }
  }
  @media (max-width:600px) {
    .time { font-size:clamp(54px,14vw,80px); }
    .day { font-size:12px; letter-spacing:.15em; }
    .services { gap:10px; }
    .presets { gap:15px; }
    .focus-time { font-size:32px; }
    .telemetry { column-gap:18px; }
    .artwork { display:none; }
  }
  @media (prefers-reduced-motion:reduce) { * { animation:none!important; transition:none!important; } }
`;
