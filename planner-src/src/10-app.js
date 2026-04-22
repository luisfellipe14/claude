// App principal
const { useState: useS, useEffect: useE, useMemo: useM } = React;

const STORAGE_KEY = 'planner_at_v1';
const THEME_KEY = 'planner_at_theme';

const migrate = (t) => ({
  subtasks: [], comments: [],
  impact: 'medio',
  fundamentacao: '',
  ...t,
});

const loadTasks = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw).map(migrate);
  } catch (e) {}
  return SEED_TASKS.map(migrate);
};

// Gera um novo ID AT-XXXX sem colisão com tarefas existentes.
const nextTaskId = (existing) => {
  const used = new Set(existing.map(t => t.id));
  const nums = existing
    .map(t => /^AT-(\d+)$/.exec(t.id))
    .filter(Boolean)
    .map(m => Number(m[1]));
  let n = (nums.length ? Math.max(...nums) : 2060) + 1;
  while (used.has('AT-' + n)) n++;
  return 'AT-' + n;
};

const newBlankTask = (status = 'todo', existing = []) => {
  const today = new Date().toISOString().slice(0, 10);
  const inWeek = new Date();inWeek.setDate(inWeek.getDate() + 7);
  return {
    id: nextTaskId(existing),
    title: '', desc: '',
    status, priority: 'media', impact: 'medio',
    fundamentacao: '',
    assignees: ['me'],
    project: 'pdd',
    start: today,
    due: inWeek.toISOString().slice(0, 10),
    progress: 0,
    tags: [],
    recurrent: null,
    subtasks: [],
    comments: []
  };
};

// Heatmap Impacto × Prioridade. Clique numa célula aplica os filtros.
const RiskHeatmap = React.memo(({ matrix, onSelect }) => {
  const [open, setOpen] = React.useState(() => localStorage.getItem('planner_at_heatmap_open') !== '0');
  React.useEffect(() => { localStorage.setItem('planner_at_heatmap_open', open ? '1' : '0'); }, [open]);
  const impRows = [{id:'alto',label:'Alto'},{id:'medio',label:'Médio'},{id:'baixo',label:'Baixo'}];
  const priCols = [{id:'alta',label:'Alta'},{id:'media',label:'Média'},{id:'baixa',label:'Baixa'}];
  return (
    <div style={{background:'var(--surface)', border:'1px solid var(--line)', borderRadius:'var(--r-lg)', marginBottom:16, overflow:'hidden'}}>
      <button onClick={() => setOpen(!open)} style={{
        width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 16px',
        background:'transparent', border:'none', cursor:'pointer', color:'var(--ink)',
        fontSize:13, fontWeight:600,
      }}>
        <Icon name="flag" size={14}/> Matriz de Risco (Impacto × Prioridade)
        <span style={{flex:1}}/>
        <span style={{fontSize:11, color:'var(--ink-3)', fontFamily:'var(--mono)', fontWeight:400}}>ativas</span>
        <Icon name={open ? 'chevronD' : 'chevronR'} size={14}/>
      </button>
      {open && (
        <div style={{padding:'4px 16px 16px', display:'grid', gridTemplateColumns:'60px repeat(3, 1fr)', gap:4, alignItems:'center'}}>
          <div/>
          {priCols.map(p => (
            <div key={p.id} style={{fontSize:10, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--ink-3)', textAlign:'center', fontWeight:600}}>
              Prio. {p.label}
            </div>
          ))}
          {impRows.map(imp => (
            <React.Fragment key={imp.id}>
              <div style={{fontSize:10, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--ink-3)', fontWeight:600, textAlign:'right', paddingRight:6}}>
                Imp. {imp.label}
              </div>
              {priCols.map(pri => {
                const items = matrix[imp.id + '-' + pri.id] || [];
                const r = riskLevel(imp.id, pri.id);
                const bg = {
                  critico: 'oklch(88% 0.10 25)',
                  alto:    'oklch(92% 0.06 45)',
                  medio:   'oklch(95% 0.04 75)',
                  baixo:   'oklch(96% 0.02 155)',
                }[r.id];
                const ink = {
                  critico: 'oklch(35% 0.14 25)',
                  alto:    'oklch(40% 0.12 45)',
                  medio:   'oklch(40% 0.10 75)',
                  baixo:   'oklch(38% 0.08 155)',
                }[r.id];
                return (
                  <button key={pri.id} onClick={() => items.length > 0 && onSelect(imp.id, pri.id)}
                    disabled={items.length === 0}
                    style={{
                      background: items.length > 0 ? bg : 'var(--bg-2)',
                      color: items.length > 0 ? ink : 'var(--ink-4)',
                      border: '1px solid ' + (items.length > 0 ? ink : 'var(--line)'),
                      borderRadius: 8, padding: '10px 8px',
                      cursor: items.length > 0 ? 'pointer' : 'default',
                      display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                      opacity: items.length > 0 ? 1 : 0.5,
                    }}>
                    <span style={{fontFamily:'var(--mono)', fontSize:18, fontWeight:700}}>{items.length}</span>
                    <span style={{fontSize:10, textTransform:'uppercase', letterSpacing:'0.04em'}}>{r.label}</span>
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
});

const App = () => {
  const [tasks, setTasks, history] = useHistory(loadTasks);
  const [view, setView] = useS(() => localStorage.getItem('planner_at_view') || 'kanban');
  const [theme, setTheme] = useS(() => localStorage.getItem(THEME_KEY) || 'light');
  const [openId, setOpenId] = useS(() => {
    // Deep link: ?task=AT-XXXX abre direto
    try {
      const p = new URLSearchParams(window.location.search);
      const t = p.get('task');
      return t && /^AT-\d+$/.test(t) ? t : null;
    } catch (e) { return null; }
  });
  const [isNew, setIsNew] = useS(false);
  const [newDraft, setNewDraft] = useS(null);

  // Filtros
  const [query, setQuery] = useS('');
  const [filterAssignee, setFilterAssignee] = useS('all');
  const [filterProject, setFilterProject] = useS('all');
  const [filterPriority, setFilterPriority] = useS('all');
  const [filterImpact, setFilterImpact] = useS('all');
  const [filterRisk, setFilterRisk] = useS('all');
  const [filterRecurrent, setFilterRecurrent] = useS(false);
  const [currentView, setCurrentView] = useS(null);
  const [showInteg, setShowInteg] = useS(false);
  const [showSync, setShowSync] = useS(false);
  const [showSettings, setShowSettings] = useS(false);
  const [showAudit, setShowAudit] = useS(false);
  const [showHotkeys, setShowHotkeys] = useS(false);
  const [, forceTick] = useS(0);
  const searchRef = React.useRef(null);

  useAutoFileSync(tasks);

  // Persistência local com debounce — evita serializar o JSON inteiro em cada tecla.
  useE(() => {
    const id = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch (e) { console.warn('Falha ao salvar localStorage', e); }
    }, 300);
    return () => clearTimeout(id);
  }, [tasks]);
  useE(() => {localStorage.setItem('planner_at_view', view);}, [view]);
  useE(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Reflete a tarefa aberta na URL para permitir compartilhar link / voltar.
  useE(() => {
    try {
      const url = new URL(window.location.href);
      if (openId) url.searchParams.set('task', openId);
      else url.searchParams.delete('task');
      window.history.replaceState(null, '', url.toString());
    } catch (e) {}
  }, [openId]);

  const filtered = useM(() => {
    return tasks.filter((t) => {
      if (query) {
        const q = query.toLowerCase();
        if (!(t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.desc || '').toLowerCase().includes(q) ||
        (t.fundamentacao || '').toLowerCase().includes(q) ||
        t.tags.some((tg) => tg.toLowerCase().includes(q)))) return false;
      }
      if (filterAssignee !== 'all' && !t.assignees.includes(filterAssignee)) return false;
      if (filterProject !== 'all' && t.project !== filterProject) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (filterImpact !== 'all' && (t.impact || 'medio') !== filterImpact) return false;
      if (filterRisk !== 'all' && riskLevel(t.impact || 'medio', t.priority).id !== filterRisk) return false;
      if (filterRecurrent && !t.recurrent) return false;
      return true;
    });
  }, [tasks, query, filterAssignee, filterProject, filterPriority, filterImpact, filterRisk, filterRecurrent]);

  // Stats (todas as tasks, não filtradas — visão geral)
  const stats = useM(() => {
    const todayD = new Date();todayD.setHours(0, 0, 0, 0);
    const active = tasks.filter((t) => t.status !== 'done' && t.status !== 'cancel');
    const overdue = active.filter((t) => new Date(t.due) < todayD).length;
    const dueSoon = active.filter((t) => {
      const dd = new Date(t.due);const diff = (dd - todayD) / 86400000;
      return diff >= 0 && diff <= 3;
    }).length;
    const inProg = tasks.filter((t) => t.status === 'progress').length;
    const myActive = active.filter((t) => t.assignees.includes('me')).length;
    const critical = active.filter((t) => riskLevel(t.impact || 'medio', t.priority).id === 'critico').length;
    return { active: active.length, overdue, dueSoon, inProg, myActive, critical };
  }, [tasks]);

  // Matriz Risco (Impacto × Prioridade) das tarefas ativas.
  const riskMatrix = useM(() => {
    const cells = {};
    ['alto','medio','baixo'].forEach(i => ['alta','media','baixa'].forEach(p => { cells[i+'-'+p] = []; }));
    tasks.forEach(t => {
      if (t.status === 'done' || t.status === 'cancel') return;
      const key = (t.impact || 'medio') + '-' + t.priority;
      if (cells[key]) cells[key].push(t);
    });
    return cells;
  }, [tasks]);

  const openTask = tasks.find((t) => t.id === openId);

  const audit = (entry) => { if (typeof appendAudit === 'function') appendAudit(entry); };

  const handleMove = (id, newStatus) => {
    const prev = tasks.find(t => t.id === id);
    setTasks(tasks.map((t) => t.id === id ? { ...t, status: newStatus, progress: newStatus === 'done' ? 100 : t.progress } : t));
    const fromLabel = STATUSES.find(s => s.id === prev?.status)?.label || prev?.status || '—';
    const statusLabel = STATUSES.find(s => s.id === newStatus)?.label || newStatus;
    audit({ action:'move', taskId:id, taskTitle:prev?.title, detail:`${fromLabel} → ${statusLabel}` });
    toast({ msg: `"${prev?.title || id}" → ${statusLabel}`, kind: 'success' });
  };
  const handleSave = (t) => {
    if (isNew) {
      setTasks([...tasks, t]);
      setIsNew(false);setNewDraft(null);
      audit({ action:'create', taskId:t.id, taskTitle:t.title });
      toast({ msg: `Tarefa ${t.id} criada`, kind: 'success' });
    } else {
      const prev = tasks.find(x => x.id === t.id);
      setTasks(tasks.map((x) => x.id === t.id ? t : x));
      const changedFields = prev ? Object.keys(t).filter(k => JSON.stringify(t[k]) !== JSON.stringify(prev[k])) : [];
      audit({ action:'update', taskId:t.id, taskTitle:t.title, detail: changedFields.length ? `Alterados: ${changedFields.join(', ')}` : '' });
      toast({ msg: `Tarefa ${t.id} salva`, kind: 'success' });
    }
    setOpenId(null);
  };
  const handleDelete = (id) => {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    if (!confirm('Excluir esta tarefa?')) return;
    setTasks(tasks.filter((x) => x.id !== id));
    setOpenId(null);setIsNew(false);setNewDraft(null);
    audit({ action:'delete', taskId:id, taskTitle:t.title });
    toast({
      msg: `Tarefa ${id} excluída`, kind: 'info',
      action: { label: 'Desfazer', onClick: () => history.undo() }
    });
  };
  const handleNew = (status = 'todo') => {
    const d = newBlankTask(status, tasks);
    setNewDraft(d);
    setIsNew(true);
  };
  const updateTaskDates = (id, start, due) => {
    const prev = tasks.find(t => t.id === id);
    setTasks(tasks.map(t => t.id === id ? { ...t, start, due } : t));
    if (prev && (prev.start !== start || prev.due !== due)) {
      audit({ action:'resize', taskId:id, taskTitle:prev.title, detail:`${start} → ${due}` });
    }
  };

  const exportCSV = () => {
    const source = filtered.length > 0 ? filtered : tasks;
    const header = ['ID', 'Título', 'Escopo', 'Fundamentação', 'Status', 'Prioridade', 'Impacto', 'Risco', 'Responsáveis', 'Objetivo estratégico', 'Projeto', 'Início', 'Prazo fatal', 'Progresso', 'Tags'];
    const rows = source.map((t) => {
      const proj = PROJECTS.find((p) => p.id === t.project);
      const obj = proj && (window.OBJECTIVES || []).find((o) => o.id === proj.objective);
      return [
        t.id, t.title, t.desc || '', t.fundamentacao || '',
        STATUSES.find((s) => s.id === t.status)?.label,
        PRIORITIES.find((p) => p.id === t.priority)?.label || t.priority,
        IMPACTS.find((i) => i.id === (t.impact || 'medio'))?.label,
        riskLevel(t.impact || 'medio', t.priority).label,
        t.assignees.map((a) => TEAM.find((x) => x.id === a)?.name).join('; '),
        obj?.label || '',
        proj?.label || '',
        t.start, t.due, t.progress + '%', t.tags.join('; '),
      ];
    });
    const csv = [header, ...rows].map((r) => r.map((v) => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;a.download = `planner-at-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();URL.revokeObjectURL(url);
    toast({ msg: `${source.length} tarefa(s) exportada(s)${source === filtered && filtered.length < tasks.length ? ' (filtrado)' : ''}`, kind: 'success' });
  };

  // Atalhos globais
  useHotkeys({
    'n': () => { if (!openId && !isNew) handleNew('todo'); },
    '/': () => { searchRef.current?.focus(); searchRef.current?.select(); },
    'k': () => { if (!openId && !isNew) setView('kanban'); },
    't': () => { if (!openId && !isNew) setView('timeline'); },
    '?': () => setShowHotkeys(true),
    'escape': () => {
      if (showHotkeys) setShowHotkeys(false);
      else if (showInteg) setShowInteg(false);
      else if (showSync) setShowSync(false);
      else if (showSettings) setShowSettings(false);
      else if (showAudit) setShowAudit(false);
      else if (isNew) { setIsNew(false); setNewDraft(null); }
      else if (openId) setOpenId(null);
    },
    'mod+z': () => { if (history.canUndo) { history.undo(); toast({ msg: 'Desfeito', kind: 'info', ttl: 1500 }); } },
    'mod+shift+z': () => { if (history.canRedo) { history.redo(); toast({ msg: 'Refeito', kind: 'info', ttl: 1500 }); } },
    'mod+y': () => { if (history.canRedo) { history.redo(); toast({ msg: 'Refeito', kind: 'info', ttl: 1500 }); } },
    'mod+k': (e) => { e.preventDefault?.(); searchRef.current?.focus(); searchRef.current?.select(); },
  }, [openId, isNew, showHotkeys, showInteg, showSync, showSettings, showAudit, history.canUndo, history.canRedo]);

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <BrandMark />
          <span className="brand-title">Planner</span>
          <span className="brand-sub">AT · 69/138 kV</span>
        </div>

        <div className="tabs">
          <button className={view === 'kanban' ? 'active' : ''} onClick={() => setView('kanban')}>
            <Icon name="kanban" /> Kanban
          </button>
          <button className={view === 'timeline' ? 'active' : ''} onClick={() => setView('timeline')}>
            <Icon name="gantt" /> Timeline
          </button>
        </div>

        <div className="top-actions">
          <button
            className="icon-btn"
            onClick={() => history.undo()}
            disabled={!history.canUndo}
            title="Desfazer (⌘Z)"
            style={{ opacity: history.canUndo ? 1 : 0.35 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>
            </svg>
          </button>
          <button
            className="icon-btn"
            onClick={() => history.redo()}
            disabled={!history.canRedo}
            title="Refazer (⌘⇧Z)"
            style={{ opacity: history.canRedo ? 1 : 0.35 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 15-6.7L21 13"/>
            </svg>
          </button>
          <div style={{ width: 1, height: 22, background: 'var(--line)', margin: '0 2px' }} />
          <NotifBell tasks={tasks} onOpen={id => setOpenId(id)}/>
          <button className="icon-btn" onClick={() => setShowSync(true)} title="Armazenamento / Backup">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>
            </svg>
          </button>
          <button className="icon-btn" onClick={() => setShowSettings(true)} title="Configurações">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1A1.7 1.7 0 0 0 10 3.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1c.2.6.8 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
            </svg>
          </button>
          <button className="icon-btn" onClick={() => setShowInteg(true)} title="Integrações">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>
            </svg>
          </button>
          <button className="icon-btn" onClick={() => setShowAudit(true)} title="Log de auditoria">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>
            </svg>
          </button>
          <button className="btn" onClick={exportCSV} title="Exportar CSV">
            <Icon name="export" /> Exportar
          </button>
          <button className="btn btn-primary" onClick={() => handleNew('todo')}>
            <Icon name="plus" /> Nova tarefa
          </button>
          <div style={{ width: 1, height: 22, background: 'var(--line)', margin: '0 4px' }} />
          <button className="icon-btn" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Alternar tema">
            <Icon name={theme === 'light' ? 'moon' : 'sun'} />
          </button>
          <button className="icon-btn" onClick={() => setShowHotkeys(true)} title="Atalhos de teclado (?)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="toolbar">
        <ViewsMenu
          current={currentView}
          activeFilters={{ assignee: filterAssignee, project: filterProject, priority: filterPriority, recurrent: filterRecurrent, query }}
          onApply={(v) => {
            setFilterAssignee(v.filters.assignee);
            setFilterProject(v.filters.project);
            setFilterPriority(v.filters.priority);
            setFilterRecurrent(v.filters.recurrent);
            setQuery(v.filters.query || '');
            setCurrentView(v);
          }}
        />
        <div className="search">
          <Icon name="search" />
          <input
            ref={searchRef}
            type="search"
            placeholder="Buscar por título, ID, tag…"
            value={query}
            onChange={(e) => setQuery(e.target.value)} />
          
          <kbd>⌘K</kbd>
        </div>

        <div className="toolbar-divider" />

        <select className="select" value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
          <option value="all">Todos responsáveis</option>
          {TEAM.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select className="select" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
          <option value="all">Todos projetos</option>
          {PROJECTS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>

        <div className="chip-group" title="Prioridade (urgência)">
          {['all', 'alta', 'media', 'baixa'].map((p) =>
          <div key={p}
          className={'chip' + (filterPriority === p ? ' active' : '')}
          onClick={() => setFilterPriority(p)}>
              {p === 'all' ? 'Todas' : p === 'media' ? 'Média' : p.charAt(0).toUpperCase() + p.slice(1)}
            </div>
          )}
        </div>

        <select className="select" value={filterImpact} onChange={(e) => setFilterImpact(e.target.value)} title="Impacto no negócio">
          <option value="all">Todos impactos</option>
          {IMPACTS.map((i) => <option key={i.id} value={i.id}>Impacto {i.label.toLowerCase()}</option>)}
        </select>

        <select className="select" value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)} title="Risco (Impacto × Prioridade)">
          <option value="all">Todos riscos</option>
          <option value="critico">Risco Crítico</option>
          <option value="alto">Risco Alto</option>
          <option value="medio">Risco Médio</option>
          <option value="baixo">Risco Baixo</option>
        </select>

        <div className={'chip' + (filterRecurrent ? ' active' : '')} onClick={() => setFilterRecurrent(!filterRecurrent)}>
          <Icon name="repeat" size={11} /> Recorrentes
        </div>

        <span style={{ flex: 1 }} />

        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
          {filtered.length}/{tasks.length}
        </span>
      </div>

      <div className="main">
        <div className="stats">
          <div className="stat">
            <div className="stat-icon"><Icon name="inbox" /></div>
            <div>
              <div className="num">{stats.active}</div>
              <div className="lbl">Ativas</div>
            </div>
          </div>
          <div className="stat">
            <div className="stat-icon accent"><Icon name="zap" /></div>
            <div>
              <div className="num">{stats.inProg}</div>
              <div className="lbl">Em Execução</div>
            </div>
          </div>
          <div className="stat">
            <div className="stat-icon alert"><Icon name="alert" /></div>
            <div>
              <div className="num">{stats.overdue}</div>
              <div className="lbl">Atrasadas</div>
            </div>
          </div>
          <div className="stat">
            <div className="stat-icon"><Icon name="clock" /></div>
            <div>
              <div className="num">{stats.dueSoon}</div>
              <div className="lbl">Vencem ≤ 3d</div>
            </div>
          </div>
          <div className="stat" onClick={() => setFilterRisk('critico')} style={{cursor: stats.critical > 0 ? 'pointer' : 'default'}} title="Clique para filtrar">
            <div className="stat-icon alert"><Icon name="flag" /></div>
            <div>
              <div className="num">{stats.critical}</div>
              <div className="lbl">Risco crítico</div>
            </div>
          </div>
          <div className="stat">
            <div className="stat-icon"><Icon name="user" /></div>
            <div>
              <div className="num">{stats.myActive}</div>
              <div className="lbl">Minhas ativas</div>
            </div>
          </div>
        </div>

        <RiskHeatmap matrix={riskMatrix} onSelect={(imp, pri) => { setFilterImpact(imp); setFilterPriority(pri); }}/>

        {view === 'kanban' &&
        <KanbanView
          tasks={filtered}
          onOpen={(id) => setOpenId(id)}
          onMove={handleMove}
          onNew={(status) => handleNew(status)} />

        }
        {view === 'timeline' &&
        <TimelineView
          tasks={filtered}
          onOpen={(id) => setOpenId(id)}
          onUpdateDates={updateTaskDates} />

        }
      </div>

      {openTask && !isNew &&
      <TaskModal
        task={openTask}
        onClose={() => setOpenId(null)}
        onSave={handleSave}
        onDelete={handleDelete} />

      }
      {isNew && newDraft &&
      <TaskModal
        task={newDraft}
        onClose={() => {setIsNew(false);setNewDraft(null);}}
        onSave={handleSave}
        onDelete={() => {setIsNew(false);setNewDraft(null);}} />

      }
      {showInteg && <IntegrationModal tasks={tasks} onClose={() => setShowInteg(false)}/>}
      {showSync && <SyncPanel tasks={tasks} onImport={(imported) => setTasks(imported.map(migrate))} onClose={() => setShowSync(false)}/>}
      {showSettings && <SettingsPanel tasks={tasks} onTasksChange={setTasks} onDataChange={() => forceTick(x=>x+1)} onClose={() => setShowSettings(false)}/>}
      {showAudit && <AuditPanel onClose={() => setShowAudit(false)} />}
      {showHotkeys && <HotkeysHelp onClose={() => setShowHotkeys(false)} />}
      <ToastHost />
    </div>);

};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);