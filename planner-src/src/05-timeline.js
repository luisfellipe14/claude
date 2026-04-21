// Timeline / Gantt view com drag para remarcar datas
const { useMemo: useMemoTL, useState: useStateTL, useRef: useRefTL } = React;

const DAY_W = 28;

// Converter Date -> YYYY-MM-DD (timezone-safe, usa componentes locais)
const dtoISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const TimelineView = ({ tasks, onOpen, onUpdateDates }) => {
  const [anchor, setAnchor] = useStateTL(() => {
    const t = new Date(); t.setHours(0,0,0,0);
    t.setDate(t.getDate() - 10);
    return t;
  });
  const DAYS = 56;
  const dragRef = useRefTL(null);
  const [dragState, setDragState] = useStateTL(null); // { id, mode, origX, origStart, origEnd, curStart, curEnd }

  const days = useMemoTL(() => {
    const arr = [];
    for (let i = 0; i < DAYS; i++) {
      const dt = new Date(anchor);
      dt.setDate(dt.getDate() + i);
      arr.push(dt);
    }
    return arr;
  }, [anchor]);

  const todayD = new Date(); todayD.setHours(0,0,0,0);
  const todayIdx = Math.round((todayD - anchor) / 86400000);

  const months = useMemoTL(() => {
    const arr = [];
    let cur = null;
    days.forEach((d, i) => {
      const key = d.getFullYear() + '-' + d.getMonth();
      if (!cur || cur.key !== key) {
        cur = { key, label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), start: i, span: 1 };
        arr.push(cur);
      } else {
        cur.span++;
      }
    });
    return arr;
  }, [days]);

  const sortedTasks = useMemoTL(() => {
    return [...tasks].sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [tasks]);

  const gridW = DAYS * DAY_W;

  // Drag handlers
  const onBarMouseDown = (e, task, mode) => {
    if (!onUpdateDates) return;
    e.preventDefault();
    e.stopPropagation();
    const startD = new Date(task.start); startD.setHours(0,0,0,0);
    const dueD = new Date(task.due); dueD.setHours(0,0,0,0);
    const startIdx = Math.round((startD - anchor) / 86400000);
    const endIdx = Math.round((dueD - anchor) / 86400000);
    setDragState({
      id: task.id, mode,
      origX: e.clientX,
      origStart: startIdx, origEnd: endIdx,
      curStart: startIdx, curEnd: endIdx,
    });
  };

  React.useEffect(() => {
    if (!dragState) return;
    const onMove = (e) => {
      const delta = Math.round((e.clientX - dragState.origX) / DAY_W);
      setDragState(s => {
        if (!s) return s;
        let ns = s.origStart, ne = s.origEnd;
        if (s.mode === 'move') { ns += delta; ne += delta; }
        else if (s.mode === 'resize-l') { ns = Math.min(s.origEnd, s.origStart + delta); }
        else if (s.mode === 'resize-r') { ne = Math.max(s.origStart, s.origEnd + delta); }
        return { ...s, curStart: ns, curEnd: ne };
      });
    };
    const onUp = () => {
      if (dragState && (dragState.curStart !== dragState.origStart || dragState.curEnd !== dragState.origEnd)) {
        const newStart = new Date(anchor); newStart.setDate(newStart.getDate() + dragState.curStart);
        const newEnd = new Date(anchor); newEnd.setDate(newEnd.getDate() + dragState.curEnd);
        onUpdateDates(dragState.id, dtoISO(newStart), dtoISO(newEnd));
        if (window.toast) {
          const lbl = dragState.mode === 'move' ? 'Período' : (dragState.mode === 'resize-l' ? 'Início' : 'Conclusão');
          window.toast({ msg: `${lbl} atualizado`, kind: 'success', ttl: 1800 });
        }
      }
      setDragState(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragState, anchor, onUpdateDates]);

  return (
    <div className="timeline-wrap">
      <div className="timeline-head">
        <h3>Linha do tempo</h3>
        <div className="timeline-nav">
          <button className="icon-btn" onClick={() => {
            const a = new Date(anchor); a.setDate(a.getDate() - 14); setAnchor(a);
          }}><Icon name="chevronL"/></button>
          <span className="pill">
            {days[0].toLocaleDateString('pt-BR', { day:'2-digit', month:'short' })}
            {' — '}
            {days[DAYS-1].toLocaleDateString('pt-BR', { day:'2-digit', month:'short' })}
          </span>
          <button className="icon-btn" onClick={() => {
            const a = new Date(anchor); a.setDate(a.getDate() + 14); setAnchor(a);
          }}><Icon name="chevronR"/></button>
          <button className="btn btn-ghost" style={{marginLeft:6}} onClick={() => {
            const t = new Date(); t.setHours(0,0,0,0); t.setDate(t.getDate()-10); setAnchor(t);
          }}>Hoje</button>
        </div>
      </div>

      <div className="timeline-grid" ref={dragRef}>
        <div className="tl-col-left" style={{gridRow:'1', gridColumn:'1'}}>
          <div className="tl-header-left" style={{height: 48}}>Tarefa</div>
        </div>
        <div className="tl-col-right" style={{gridRow:'1', gridColumn:'2', width: gridW, position:'sticky', top:0, zIndex:3, background:'var(--surface)'}}>
          <div className="tl-months" style={{
            gridTemplateColumns: months.map(m => `${m.span*DAY_W}px`).join(' '),
            width: gridW
          }}>
            {months.map(m => <div key={m.key} className="tl-month-cell">{m.label}</div>)}
          </div>
          <div className="tl-days" style={{
            gridTemplateColumns: `repeat(${DAYS}, ${DAY_W}px)`,
            width: gridW
          }}>
            {days.map((d, i) => {
              const wknd = d.getDay() === 0 || d.getDay() === 6;
              const isToday = i === todayIdx;
              return (
                <div key={i} className={'tl-day-cell' + (wknd?' weekend':'') + (isToday?' today':'')}>
                  {d.getDate()}
                </div>
              );
            })}
          </div>
        </div>

        {sortedTasks.map((t, rowIdx) => {
          const startD = new Date(t.start); startD.setHours(0,0,0,0);
          const dueD = new Date(t.due); dueD.setHours(0,0,0,0);
          let startIdx = Math.round((startD - anchor) / 86400000);
          let endIdx = Math.round((dueD - anchor) / 86400000);

          // Overlay dos índices em drag
          const isDragging = dragState && dragState.id === t.id;
          if (isDragging) { startIdx = dragState.curStart; endIdx = dragState.curEnd; }

          const visible = !(endIdx < 0 || startIdx >= DAYS);
          const clampStart = Math.max(0, startIdx);
          const clampLen = Math.min(DAYS, endIdx + 1) - clampStart;

          return (
            <React.Fragment key={t.id}>
              <div className="tl-row-left" style={{gridColumn:'1'}}>
                <div className="pri-dot" style={{
                  background:
                    t.priority === 'alta' ? 'var(--p-alta)' :
                    t.priority === 'baixa' ? 'var(--p-baixa)' : 'var(--p-media)'
                }}/>
                <div className="info">
                  <div className="t-code">{t.id}</div>
                  <div className="t-title">{t.title}</div>
                </div>
                <div className="avatar-stack" style={{flexShrink:0}}>
                  {t.assignees.slice(0,2).map(a => <Avatar key={a} id={a} size={20}/>)}
                </div>
              </div>
              <div className="tl-row-right" style={{gridColumn:'2', width: gridW}}>
                {days.map((d, i) => {
                  const wknd = d.getDay() === 0 || d.getDay() === 6;
                  const isToday = i === todayIdx;
                  return (
                    <div key={i} className={'tl-grid-cell' + (wknd?' weekend':'') + (isToday?' today-col':'')}
                         style={{left: i*DAY_W, width: DAY_W}}/>
                  );
                })}
                {todayIdx >= 0 && todayIdx < DAYS && (
                  <div className="tl-today-line" style={{ left: todayIdx * DAY_W + DAY_W/2 }}/>
                )}
                {visible && (
                  <div
                    className={`tl-bar s-${t.status} pri-${t.priority}` + (isDragging ? ' dragging' : '')}
                    style={{
                      left: clampStart * DAY_W + 2,
                      width: clampLen * DAY_W - 4,
                    }}
                    title={`${t.title}  ·  ${t.start} → ${t.due}`}
                  >
                    {t.progress > 0 && t.progress < 100 && (
                      <span className="tl-progress" style={{width: `${t.progress}%`}}/>
                    )}
                    <div className="tl-bar-handle-l" onMouseDown={(e) => onBarMouseDown(e, t, 'resize-l')}/>
                    <div
                      className="tl-bar-body"
                      onMouseDown={(e) => onBarMouseDown(e, t, 'move')}
                      onClick={(e) => { if (!isDragging) onOpen(t.id); }}
                    >
                      <span style={{position:'relative', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1}}>
                        {t.id} · {t.title}
                      </span>
                      <span className="tl-assignees">
                        {t.assignees.slice(0,2).map(a => <Avatar key={a} id={a} size={18}/>)}
                      </span>
                    </div>
                    <div className="tl-bar-handle-r" onMouseDown={(e) => onBarMouseDown(e, t, 'resize-r')}/>
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

Object.assign(window, { TimelineView });
