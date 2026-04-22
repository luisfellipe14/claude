// Kanban view
const { useState, useMemo } = React;

const KanbanCard = React.memo(({ task, onOpen, onDragStart, onDragEnd, isDragging }) => {
  const dueDate = new Date(task.due);
  const todayD = new Date(); todayD.setHours(0,0,0,0);
  const diffDays = Math.round((dueDate - todayD) / 86400000);
  let dueClass = '';
  let dueText = '';
  if (task.status === 'done' || task.status === 'cancel') {
    dueText = dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  } else if (diffDays < 0) {
    dueClass = 'overdue';
    dueText = `${Math.abs(diffDays)}d atraso`;
  } else if (diffDays === 0) {
    dueClass = 'soon';
    dueText = 'Hoje';
  } else if (diffDays <= 3) {
    dueClass = 'soon';
    dueText = `em ${diffDays}d`;
  } else {
    dueText = dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  return (
    <div
      className={'card' + (isDragging ? ' dragging' : '')}
      onClick={() => onOpen(task.id)}
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
    >
      <div className={'card-pri ' + task.priority}/>
      {task.recurrent && <span className="card-recurrent" title="Recorrente"><Icon name="repeat"/></span>}
      <div className="card-code">{task.id}</div>
      <div className="card-title">{task.title}</div>
      <div className="card-meta">
        <span className={'due ' + dueClass}>
          <Icon name="clock" size={11}/>{dueText}
        </span>
        <span className="spacer"/>
        <div className="avatar-stack">
          {task.assignees.slice(0, 3).map(a => <Avatar key={a} id={a} size={20}/>)}
        </div>
      </div>
      {task.tags.length > 0 && (
        <div className="card-tags">
          {task.tags.slice(0, 3).map(t => <span className="tag" key={t}>{t}</span>)}
        </div>
      )}
      {task.subtasks?.length > 0 && (
        <div style={{marginTop:8, display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--ink-3)'}}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>
          </svg>
          <span style={{fontFamily:'var(--mono)'}}>{task.subtasks.filter(s=>s.done).length}/{task.subtasks.length}</span>
          <div style={{flex:1, height:3, background:'var(--bg-2)', borderRadius:2, overflow:'hidden'}}>
            <div style={{
              height:'100%',
              width: `${(task.subtasks.filter(s=>s.done).length / task.subtasks.length) * 100}%`,
              background:'var(--accent)',
              transition:'width 0.3s'
            }}/>
          </div>
        </div>
      )}
    </div>
  );
});

const KanbanView = ({ tasks, onOpen, onMove, onNew }) => {
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const byStatus = useMemo(() => {
    const m = {};
    STATUSES.forEach(s => m[s.id] = []);
    tasks.forEach(t => { if (m[t.status]) m[t.status].push(t); });
    // Sort: prioridade + data
    const priOrder = { alta: 0, media: 1, baixa: 2 };
    Object.values(m).forEach(list => list.sort((a, b) => {
      const pa = priOrder[a.priority] - priOrder[b.priority];
      if (pa !== 0) return pa;
      return new Date(a.due) - new Date(b.due);
    }));
    return m;
  }, [tasks]);

  return (
    <div className="kanban">
      {STATUSES.map(s => (
        <div
          key={s.id}
          className="col"
          onDragOver={(e) => { e.preventDefault(); setDragOver(s.id); }}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => {
            e.preventDefault();
            if (dragId) onMove(dragId, s.id);
            setDragId(null); setDragOver(null);
          }}
          style={dragOver === s.id ? { outline: '2px dashed var(--accent)', outlineOffset: '-4px' } : null}
        >
          <div className="col-head">
            <span className="status-dot" style={{ background: s.color }}/>
            <span className="name">{s.label}</span>
            <span className="n">{byStatus[s.id].length}</span>
            <button className="add-btn" onClick={() => onNew(s.id)} title="Nova tarefa">
              <Icon name="plus" size={14}/>
            </button>
          </div>
          <div className="col-body">
            {byStatus[s.id].map(t => (
              <KanbanCard
                key={t.id} task={t}
                onOpen={onOpen}
                onDragStart={(e, id) => { setDragId(id); e.dataTransfer.effectAllowed = 'move'; }}
                onDragEnd={() => { setDragId(null); setDragOver(null); }}
                isDragging={dragId === t.id}
              />
            ))}
            {byStatus[s.id].length === 0 && (
              <div className="empty" style={{ padding: '20px 8px', fontSize: 12 }}>
                Vazio
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

Object.assign(window, { KanbanView });
