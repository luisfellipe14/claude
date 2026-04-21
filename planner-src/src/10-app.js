// App principal
const { useState: useS, useEffect: useE, useMemo: useM } = React;

const STORAGE_KEY = 'planner_at_v1';
const THEME_KEY = 'planner_at_theme';

const migrate = (t) => ({ subtasks: [], comments: [], ...t });

const loadTasks = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw).map(migrate);
  } catch (e) {}
  return SEED_TASKS.map(migrate);
};

const newBlankTask = (status = 'todo') => {
  const today = new Date().toISOString().slice(0, 10);
  const inWeek = new Date();inWeek.setDate(inWeek.getDate() + 7);
  return {
    id: 'AT-' + (2060 + Math.floor(Math.random() * 900)),
    title: '', desc: '',
    status, priority: 'media',
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

const App = () => {
  const [tasks, setTasks, history] = useHistory(loadTasks);
  const [view, setView] = useS(() => localStorage.getItem('planner_at_view') || 'kanban');
  const [theme, setTheme] = useS(() => localStorage.getItem(THEME_KEY) || 'light');
  const [openId, setOpenId] = useS(null);
  const [isNew, setIsNew] = useS(false);
  const [newDraft, setNewDraft] = useS(null);

  // Filtros
  const [query, setQuery] = useS('');
  const [filterAssignee, setFilterAssignee] = useS('all');
  const [filterProject, setFilterProject] = useS('all');
  const [filterPriority, setFilterPriority] = useS('all');
  const [filterRecurrent, setFilterRecurrent] = useS(false);
  const [currentView, setCurrentView] = useS(null);
  const [showInteg, setShowInteg] = useS(false);
  const [showSync, setShowSync] = useS(false);
  const [showSettings, setShowSettings] = useS(false);
  const [showHotkeys, setShowHotkeys] = useS(false);
  const [, forceTick] = useS(0);
  const searchRef = React.useRef(null);

  useAutoFileSync(tasks);

  useE(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);
  useE(() => {localStorage.setItem('planner_at_view', view);}, [view]);
  useE(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const filtered = useM(() => {
    return tasks.filter((t) => {
      if (query) {
        const q = query.toLowerCase();
        if (!(t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.desc || '').toLowerCase().includes(q) ||
        t.tags.some((tg) => tg.toLowerCase().includes(q)))) return false;
      }
      if (filterAssignee !== 'all' && !t.assignees.includes(filterAssignee)) return false;
      if (filterProject !== 'all' && t.project !== filterProject) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (filterRecurrent && !t.recurrent) return false;
      return true;
    });
  }, [tasks, query, filterAssignee, filterProject, filterPriority, filterRecurrent]);

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
    return { active: active.length, overdue, dueSoon, inProg, myActive };
  }, [tasks]);

  const openTask = tasks.find((t) => t.id === openId);

  const handleMove = (id, newStatus) => {
    const prev = tasks.find(t => t.id === id);
    setTasks(tasks.map((t) => t.id === id ? { ...t, status: newStatus, progress: newStatus === 'done' ? 100 : t.progress } : t));
    const statusLabel = STATUSES.find(s => s.id === newStatus)?.label || newStatus;
    toast({ msg: `"${prev?.title || id}" → ${statusLabel}`, kind: 'success' });
  };
  const handleSave = (t) => {
    if (isNew) {
      setTasks([...tasks, t]);
      setIsNew(false);setNewDraft(null);
      toast({ msg: `Tarefa ${t.id} criada`, kind: 'success' });
    } else {
      setTasks(tasks.map((x) => x.id === t.id ? t : x));
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
    toast({
      msg: `Tarefa ${id} excluída`, kind: 'info',
      action: { label: 'Desfazer', onClick: () => history.undo() }
    });
  };
  const handleNew = (status = 'todo') => {
    const d = newBlankTask(status);
    setNewDraft(d);
    setIsNew(true);
  };
  const updateTaskDates = (id, start, due) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, start, due } : t));
  };

  const exportCSV = () => {
    const header = ['ID', 'Título', 'Status', 'Prioridade', 'Responsáveis', 'Projeto', 'Início', 'Conclusão', 'Progresso', 'Tags'];
    const rows = tasks.map((t) => [
    t.id, t.title,
    STATUSES.find((s) => s.id === t.status)?.label,
    t.priority,
    t.assignees.map((a) => TEAM.find((x) => x.id === a)?.name).join('; '),
    PROJECTS.find((p) => p.id === t.project)?.label || '',
    t.start, t.due, t.progress + '%', t.tags.join('; ')]
    );
    const csv = [header, ...rows].map((r) => r.map((v) => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;a.download = `planner-at-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();URL.revokeObjectURL(url);
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
      else if (isNew) { setIsNew(false); setNewDraft(null); }
      else if (openId) setOpenId(null);
    },
    'mod+z': () => { if (history.canUndo) { history.undo(); toast({ msg: 'Desfeito', kind: 'info', ttl: 1500 }); } },
    'mod+shift+z': () => { if (history.canRedo) { history.redo(); toast({ msg: 'Refeito', kind: 'info', ttl: 1500 }); } },
    'mod+y': () => { if (history.canRedo) { history.redo(); toast({ msg: 'Refeito', kind: 'info', ttl: 1500 }); } },
    'mod+k': (e) => { e.preventDefault?.(); searchRef.current?.focus(); searchRef.current?.select(); },
  }, [openId, isNew, showHotkeys, showInteg, showSync, showSettings, history.canUndo, history.canRedo]);

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

        <div className="chip-group">
          {['all', 'alta', 'media', 'baixa'].map((p) =>
          <div key={p}
          className={'chip' + (filterPriority === p ? ' active' : '')}
          onClick={() => setFilterPriority(p)}>
              {p === 'all' ? 'Todas' : p === 'media' ? 'Média' : p.charAt(0).toUpperCase() + p.slice(1)}
            </div>
          )}
        </div>

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
              <div className="lbl">Em andamento</div>
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
          <div className="stat">
            <div className="stat-icon"><Icon name="user" /></div>
            <div>
              <div className="num">{stats.myActive}</div>
              <div className="lbl">Minhas ativas</div>
            </div>
          </div>
        </div>

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
      {showHotkeys && <HotkeysHelp onClose={() => setShowHotkeys(false)} />}
      <ToastHost />
    </div>);

};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);