// Timeline / Gantt view com drag para remarcar datas + setas de dependência
const { useMemo: useMemoTL, useState: useStateTL, useRef: useRefTL, useCallback: useCallbackTL } = React;

const DAY_W = 28;
const ROW_H = 44;
const HEADER_H = 48;
const LEFT_W = 280;

// Converter Date -> YYYY-MM-DD (timezone-safe, usa componentes locais)
const dtoISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Background grid memoizado — re-renderiza só quando anchor ou today muda
const TimelineGridBg = React.memo(({ days, todayIdx }) => (
  <>
    {days.map((d, i) => {
      const wknd = d.getDay() === 0 || d.getDay() === 6;
      const isToday = i === todayIdx;
      return (
        <div key={i}
          className={'tl-grid-cell' + (wknd ? ' weekend' : '') + (isToday ? ' today-col' : '')}
          style={{ left: i * DAY_W, width: DAY_W }}
        />
      );
    })}
    {todayIdx >= 0 && todayIdx < days.length && (
      <div className="tl-today-line" style={{ left: todayIdx * DAY_W + DAY_W / 2 }} />
    )}
  </>
));

const TimelineView = ({ tasks, allTasks, onOpen, onUpdateDates }) => {
  const [anchor, setAnchor] = useStateTL(() => {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    t.setDate(t.getDate() - 10);
    return t;
  });
  const DAYS = 56;
  const dragRef = useRefTL(null);
  const [dragState, setDragState] = useStateTL(null);

  const days = useMemoTL(() => {
    const arr = [];
    for (let i = 0; i < DAYS; i++) {
      const dt = new Date(anchor);
      dt.setDate(dt.getDate() + i);
      arr.push(dt);
    }
    return arr;
  }, [anchor]);

  const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
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

  // Mapa taskId -> rowIdx para cálculo de setas
  const rowIndexMap = useMemoTL(() => {
    const m = {};
    sortedTasks.forEach((t, i) => { m[t.id] = i; });
    return m;
  }, [sortedTasks]);

  // Dados das setas de dependência, com overlay do dragState
  const arrowsData = useMemoTL(() => {
    const source = allTasks || tasks;
    const result = [];
    sortedTasks.forEach(succ => {
      if (!succ.deps || !succ.deps.length) return;
      succ.deps.forEach(predId => {
        const pred = sortedTasks.find(t => t.id === predId);
        if (pred == null) return;
        const predRow = rowIndexMap[predId];
        const succRow = rowIndexMap[succ.id];
        if (predRow == null || succRow == null) return;

        const predDueD = new Date(pred.due); predDueD.setHours(0, 0, 0, 0);
        const succStartD = new Date(succ.start); succStartD.setHours(0, 0, 0, 0);
        let predEndIdx = Math.round((predDueD - anchor) / 86400000);
        let succStartIdx = Math.round((succStartD - anchor) / 86400000);
        if (dragState) {
          if (dragState.id === pred.id) predEndIdx = dragState.curEnd;
          if (dragState.id === succ.id) succStartIdx = dragState.curStart;
        }
        result.push({
          key: predId + '->' + succ.id,
          x1: LEFT_W + (predEndIdx + 1) * DAY_W,
          y1: HEADER_H + predRow * ROW_H + ROW_H / 2,
          x2: LEFT_W + succStartIdx * DAY_W,
          y2: HEADER_H + succRow * ROW_H + ROW_H / 2,
          late: predDueD >= succStartD,
        });
      });
    });
    return result;
  }, [sortedTasks, rowIndexMap, anchor, dragState, allTasks, tasks]);

  // Drag handlers
  const onBarMouseDown = useCallbackTL((e, task, mode) => {
    if (!onUpdateDates) return;
    e.preventDefault();
    e.stopPropagation();
    const startD = new Date(task.start); startD.setHours(0, 0, 0, 0);
    const dueD = new Date(task.due); dueD.setHours(0, 0, 0, 0);
    const startIdx = Math.round((startD - anchor) / 86400000);
    const endIdx = Math.round((dueD - anchor) / 86400000);
    setDragState({ id: task.id, mode, origX: e.clientX, origStart: startIdx, origEnd: endIdx, curStart: startIdx, curEnd: endIdx });
  }, [anchor, onUpdateDates]);

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

  const totalH = HEADER_H + sortedTasks.length * ROW_H + 4;

  return (
    <div className="timeline-wrap">
      <div className="timeline-head">
        <h3>Linha do tempo</h3>
        <div className="timeline-nav">
          <button className="icon-btn" onClick={() => {
            const a = new Date(anchor); a.setDate(a.getDate() - 14); setAnchor(a);
          }}><Icon name="chevronL" /></button>
          <span className="pill">
            {days[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            {' — '}
            {days[DAYS - 1].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </span>
          <button className="icon-btn" onClick={() => {
            const a = new Date(anchor); a.setDate(a.getDate() + 14); setAnchor(a);
          }}><Icon name="chevronR" /></button>
          <button className="btn btn-ghost" style={{ marginLeft: 6 }} onClick={() => {
            const t = new Date(); t.setHours(0, 0, 0, 0); t.setDate(t.getDate() - 10); setAnchor(t);
          }}>Hoje</button>
        </div>
      </div>

      <div className="timeline-grid" ref={dragRef} style={{ position: 'relative' }}>
        <div className="tl-col-left" style={{ gridRow: '1', gridColumn: '1' }}>
          <div className="tl-header-left" style={{ height: 48 }}>Tarefa</div>
        </div>
        <div className="tl-col-right" style={{ gridRow: '1', gridColumn: '2', width: gridW, position: 'sticky', top: 0, zIndex: 3, background: 'var(--surface)' }}>
          <div className="tl-months" style={{
            gridTemplateColumns: months.map(m => `${m.span * DAY_W}px`).join(' '),
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
                <div key={i} className={'tl-day-cell' + (wknd ? ' weekend' : '') + (isToday ? ' today' : '')}>
                  {d.getDate()}
                </div>
              );
            })}
          </div>
        </div>

        {sortedTasks.map((t, rowIdx) => {
          const startD = new Date(t.start); startD.setHours(0, 0, 0, 0);
          const dueD = new Date(t.due); dueD.setHours(0, 0, 0, 0);
          let startIdx = Math.round((startD - anchor) / 86400000);
          let endIdx = Math.round((dueD - anchor) / 86400000);

          const isDragging = dragState && dragState.id === t.id;
          if (isDragging) { startIdx = dragState.curStart; endIdx = dragState.curEnd; }

          const visible = !(endIdx < 0 || startIdx >= DAYS);
          const clampStart = Math.max(0, startIdx);
          const clampLen = Math.min(DAYS, endIdx + 1) - clampStart;
          const hasDeps = t.deps && t.deps.length > 0;

          return (
            <React.Fragment key={t.id}>
              <div className="tl-row-left" style={{ gridColumn: '1' }}>
                <div className="pri-dot" style={{
                  background:
                    t.priority === 'alta' ? 'var(--p-alta)' :
                    t.priority === 'baixa' ? 'var(--p-baixa)' : 'var(--p-media)'
                }} />
                <div className="info">
                  <div className="t-code">
                    {t.id}
                    {hasDeps && <span className="tl-dep-badge" title={`Depende de: ${t.deps.join(', ')}`}>↳</span>}
                  </div>
                  <div className="t-title">{t.title}</div>
                </div>
                <div className="avatar-stack" style={{ flexShrink: 0 }}>
                  {t.assignees.slice(0, 2).map(a => <Avatar key={a} id={a} size={20} />)}
                </div>
              </div>
              <div className="tl-row-right" style={{ gridColumn: '2', width: gridW }}>
                <TimelineGridBg days={days} todayIdx={todayIdx} />
                {visible && (
                  <div
                    className={`tl-bar s-${t.status} pri-${t.priority}` + (isDragging ? ' dragging' : '')}
                    style={{ left: clampStart * DAY_W + 2, width: clampLen * DAY_W - 4 }}
                    title={`${t.title}  ·  ${t.start} → ${t.due}`}
                  >
                    {t.progress > 0 && t.progress < 100 && (
                      <span className="tl-progress" style={{ width: `${t.progress}%` }} />
                    )}
                    <div className="tl-bar-handle-l" onMouseDown={(e) => onBarMouseDown(e, t, 'resize-l')} />
                    <div
                      className="tl-bar-body"
                      onMouseDown={(e) => onBarMouseDown(e, t, 'move')}
                      onClick={() => { if (!isDragging) onOpen(t.id); }}
                    >
                      <span style={{ position: 'relative', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {t.id} · {t.title}
                      </span>
                      <span className="tl-assignees">
                        {t.assignees.slice(0, 2).map(a => <Avatar key={a} id={a} size={18} />)}
                      </span>
                    </div>
                    <div className="tl-bar-handle-r" onMouseDown={(e) => onBarMouseDown(e, t, 'resize-r')} />
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}

        {/* SVG overlay para setas de dependência */}
        {arrowsData.length > 0 && (
          <svg
            style={{
              position: 'absolute', top: 0, left: 0,
              width: LEFT_W + gridW, height: totalH,
              pointerEvents: 'none', zIndex: 2, overflow: 'visible',
            }}
          >
            <defs>
              <marker id="dep-arrow-ok" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                <path d="M0,1 L0,6 L6,3.5 z" fill="var(--accent)" opacity="0.7" />
              </marker>
              <marker id="dep-arrow-late" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                <path d="M0,1 L0,6 L6,3.5 z" fill="var(--p-alta)" opacity="0.8" />
              </marker>
            </defs>
            {arrowsData.map(a => {
              const cx = (a.x1 + a.x2) / 2;
              const color = a.late ? 'var(--p-alta)' : 'var(--accent)';
              const markerId = a.late ? 'dep-arrow-late' : 'dep-arrow-ok';
              return (
                <path
                  key={a.key}
                  d={`M ${a.x1} ${a.y1} C ${cx} ${a.y1} ${cx} ${a.y2} ${a.x2} ${a.y2}`}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  opacity="0.65"
                  markerEnd={`url(#${markerId})`}
                />
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { TimelineView });
