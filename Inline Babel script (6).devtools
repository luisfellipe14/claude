// Notificações, Visões salvas, Integração externa
const { useState: useSX, useEffect: useEX, useMemo: useMX, useRef: useRX } = React;

/* ============= NOTIFICAÇÕES ============= */
const NotifBell = ({ tasks, onOpen }) => {
  const [open, setOpen] = useSX(false);
  const ref = useRX(null);

  useEX(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const notifs = useMX(() => {
    const todayD = new Date(); todayD.setHours(0,0,0,0);
    const active = tasks.filter(t => t.status !== 'done' && t.status !== 'cancel');
    const overdue = active.filter(t => new Date(t.due) < todayD);
    const todayDue = active.filter(t => {
      const dd = new Date(t.due); dd.setHours(0,0,0,0);
      return dd.getTime() === todayD.getTime();
    });
    const soon = active.filter(t => {
      const dd = new Date(t.due); dd.setHours(0,0,0,0);
      const diff = (dd - todayD) / 86400000;
      return diff > 0 && diff <= 3;
    });
    return { overdue, todayDue, soon, total: overdue.length + todayDue.length + soon.length };
  }, [tasks]);

  return (
    <div ref={ref} style={{position:'relative'}}>
      <button className="icon-btn" onClick={() => setOpen(!open)} title="Notificações">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
          <path d="M10 21a2 2 0 0 0 4 0"/>
        </svg>
        {notifs.total > 0 && (
          <span style={{
            position:'absolute', top:4, right:4,
            minWidth:16, height:16, padding:'0 4px',
            background: notifs.overdue.length > 0 ? 'var(--p-alta)' : 'var(--accent)',
            color:'white', borderRadius:8,
            fontSize:9, fontWeight:700, fontFamily:'var(--mono)',
            display:'grid', placeItems:'center',
            border:'2px solid var(--surface)',
          }}>{notifs.total}</span>
        )}
      </button>
      {open && (
        <div style={{
          position:'absolute', top:42, right:0, width:340,
          background:'var(--surface)', border:'1px solid var(--line)',
          borderRadius:'var(--r-lg)', boxShadow:'var(--shadow-2)',
          zIndex:50, overflow:'hidden',
        }}>
          <div style={{padding:'12px 14px', borderBottom:'1px solid var(--line)', fontWeight:600, fontSize:13}}>
            Notificações
          </div>
          <div style={{maxHeight:400, overflowY:'auto'}}>
            {notifs.total === 0 && (
              <div style={{padding:'30px 14px', textAlign:'center', color:'var(--ink-3)', fontSize:12.5}}>
                Tudo em dia ✓
              </div>
            )}
            {notifs.overdue.length > 0 && <NotifGroup title="Atrasadas" items={notifs.overdue} variant="alert" onOpen={(id)=>{setOpen(false); onOpen(id);}}/>}
            {notifs.todayDue.length > 0 && <NotifGroup title="Vencem hoje" items={notifs.todayDue} variant="accent" onOpen={(id)=>{setOpen(false); onOpen(id);}}/>}
            {notifs.soon.length > 0 && <NotifGroup title="Próximos 3 dias" items={notifs.soon} variant="soft" onOpen={(id)=>{setOpen(false); onOpen(id);}}/>}
          </div>
        </div>
      )}
    </div>
  );
};

const NotifGroup = ({ title, items, variant, onOpen }) => {
  const color = variant === 'alert' ? 'var(--p-alta)' : variant === 'accent' ? 'var(--accent)' : 'var(--ink-3)';
  return (
    <div>
      <div style={{
        padding:'8px 14px', fontSize:10, fontWeight:600,
        textTransform:'uppercase', letterSpacing:'0.06em',
        color, background:'var(--bg-2)',
      }}>{title} · {items.length}</div>
      {items.map(t => {
        const dd = new Date(t.due); const todayD = new Date(); todayD.setHours(0,0,0,0);
        const diff = Math.round((dd - todayD) / 86400000);
        const label = diff < 0 ? `${Math.abs(diff)}d atraso` : diff === 0 ? 'hoje' : `em ${diff}d`;
        return (
          <div key={t.id} onClick={() => onOpen(t.id)}
            style={{
              padding:'10px 14px', borderBottom:'1px solid var(--line)',
              cursor:'pointer', display:'flex', gap:10, alignItems:'flex-start',
            }}
            onMouseEnter={e => e.currentTarget.style.background='var(--bg-2)'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}
          >
            <div style={{
              width:4, alignSelf:'stretch', borderRadius:2,
              background: t.priority === 'alta' ? 'var(--p-alta)' : t.priority === 'baixa' ? 'var(--p-baixa)' : 'var(--p-media)',
              flexShrink:0,
            }}/>
            <div style={{flex:1, minWidth:0}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
                <span style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-3)'}}>{t.id}</span>
                <span style={{fontFamily:'var(--mono)', fontSize:10, color}}>{label}</span>
              </div>
              <div style={{fontSize:12.5, fontWeight:500, marginTop:2, lineHeight:1.35}}>{t.title}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ============= VISÕES SALVAS ============= */
const VIEWS_KEY = 'planner_at_views';

const DEFAULT_VIEWS = [
  { id: 'mine', name: 'Minhas tarefas', filters: { assignee: 'me', project: 'all', priority: 'all', recurrent: false, query: '' }, builtin: true },
  { id: 'urgent', name: 'Urgentes', filters: { assignee: 'all', project: 'all', priority: 'alta', recurrent: false, query: '' }, builtin: true },
  { id: 'regulatorio', name: 'Regulatório', filters: { assignee: 'all', project: 'audit', priority: 'all', recurrent: false, query: '' }, builtin: true },
];

const loadViews = () => {
  try {
    const raw = localStorage.getItem(VIEWS_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return DEFAULT_VIEWS;
};

const ViewsMenu = ({ current, onApply, onSave, activeFilters }) => {
  const [open, setOpen] = useSX(false);
  const [views, setViews] = useSX(loadViews);
  const [showNew, setShowNew] = useSX(false);
  const [newName, setNewName] = useSX('');
  const ref = useRX(null);

  useEX(() => {
    localStorage.setItem(VIEWS_KEY, JSON.stringify(views));
  }, [views]);

  useEX(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setShowNew(false); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const saveNew = () => {
    if (!newName.trim()) return;
    const v = { id: 'v'+Date.now(), name: newName.trim(), filters: activeFilters, builtin: false };
    setViews([...views, v]);
    setNewName(''); setShowNew(false); setOpen(false);
  };

  const removeView = (id) => {
    setViews(views.filter(v => v.id !== id));
  };

  return (
    <div ref={ref} style={{position:'relative'}}>
      <button className="btn" onClick={() => setOpen(!open)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 21l-4.35-4.35"/><circle cx="10.5" cy="10.5" r="7.5"/>
        </svg>
        {current ? current.name : 'Visões'}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      {open && (
        <div style={{
          position:'absolute', top:38, left:0, width:260,
          background:'var(--surface)', border:'1px solid var(--line)',
          borderRadius:'var(--r-md)', boxShadow:'var(--shadow-2)',
          zIndex:50, overflow:'hidden',
        }}>
          <div style={{padding:'8px 12px', fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ink-3)'}}>
            Visões salvas
          </div>
          {views.map(v => (
            <div key={v.id}
              style={{padding:'8px 12px', fontSize:13, display:'flex', alignItems:'center', gap:8, cursor:'pointer'}}
              onMouseEnter={e => e.currentTarget.style.background='var(--bg-2)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}
              onClick={() => { onApply(v); setOpen(false); }}
            >
              <span style={{flex:1}}>{v.name}</span>
              {!v.builtin && (
                <button className="icon-btn" style={{width:22, height:22}} onClick={(e)=>{e.stopPropagation(); removeView(v.id);}}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              )}
            </div>
          ))}
          <div style={{borderTop:'1px solid var(--line)', padding:8}}>
            {!showNew ? (
              <button className="btn btn-ghost" style={{width:'100%', justifyContent:'flex-start', fontSize:12}}
                onClick={() => setShowNew(true)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Salvar filtros atuais como visão
              </button>
            ) : (
              <div style={{display:'flex', gap:6}}>
                <input autoFocus value={newName} onChange={e=>setNewName(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && saveNew()}
                  placeholder="Nome da visão"
                  style={{flex:1, padding:'6px 8px', border:'1px solid var(--line)', borderRadius:6, fontSize:12, background:'var(--surface)', color:'var(--ink)', outline:'none'}}
                />
                <button className="btn btn-primary" style={{padding:'6px 10px', fontSize:12}} onClick={saveNew}>Salvar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ============= INTEGRAÇÃO EXTERNA ============= */
const INTEG_KEY = 'planner_at_integ';

const ICS_ESCAPE = (s) => (s||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');

const buildICS = (tasks) => {
  const stamp = new Date().toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Planner AT//PT-BR',
    'CALSCALE:GREGORIAN',
  ];
  tasks.forEach(t => {
    if (t.status === 'cancel') return;
    const start = t.start.replace(/-/g,'');
    const endD = new Date(t.due); endD.setDate(endD.getDate()+1);
    const end = endD.toISOString().slice(0,10).replace(/-/g,'');
    const assignees = t.assignees.map(a => TEAM.find(x=>x.id===a)?.name).filter(Boolean).join(', ');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${t.id}@planner-at`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${ICS_ESCAPE(`[${t.id}] ${t.title}`)}`,
      `DESCRIPTION:${ICS_ESCAPE(`${t.desc||''}\n\nResponsáveis: ${assignees}\nStatus: ${STATUSES.find(s=>s.id===t.status)?.label}\nPrioridade: ${t.priority}`)}`,
      `CATEGORIES:${PROJECTS.find(p=>p.id===t.project)?.label || 'Planner'}`,
      'END:VEVENT'
    );
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
};

const IntegrationModal = ({ tasks, onClose }) => {
  const [cfg, setCfg] = useSX(() => {
    try { return JSON.parse(localStorage.getItem(INTEG_KEY) || '{}'); } catch(e) { return {}; }
  });
  const [status, setStatus] = useSX('');

  useEX(() => {
    localStorage.setItem(INTEG_KEY, JSON.stringify(cfg));
  }, [cfg]);

  const exportICS = () => {
    const ics = buildICS(tasks);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `planner-at-${new Date().toISOString().slice(0,10)}.ics`;
    a.click(); URL.revokeObjectURL(url);
  };

  const sendWebhook = async () => {
    if (!cfg.webhookUrl) { setStatus('⚠ Configure a URL do webhook'); return; }
    setStatus('Enviando…');
    try {
      const payload = {
        source: 'planner-at',
        exportedAt: new Date().toISOString(),
        tasks: tasks.map(t => ({
          id: t.id, title: t.title, status: t.status, priority: t.priority,
          start: t.start, due: t.due, progress: t.progress,
          assignees: t.assignees, project: t.project,
          tags: t.tags, recurrent: t.recurrent,
        })),
      };
      const res = await fetch(cfg.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'no-cors',
      });
      setStatus('✓ Enviado (sem CORS não dá pra confirmar resposta)');
    } catch (e) {
      setStatus('✗ Erro: ' + e.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:640}}>
        <div className="modal-head">
          <div style={{flex:1}}>
            <div className="code">Integrações externas</div>
            <div className="title-input" style={{pointerEvents:'none'}}>Sincronizar com sistemas externos</div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{padding:'20px 24px', overflowY:'auto', flex:1}}>

          <IntegCard
            title="Calendário (.ics)"
            desc="Exporta todas as tarefas ativas como eventos. Importe no Outlook, Google Calendar, Apple Calendar."
            action={<button className="btn btn-primary" onClick={exportICS}>Baixar .ics</button>}
          />

          <IntegCard
            title="Webhook genérico"
            desc="POST JSON com todas as tarefas para uma URL (Zapier, Make, n8n, Power Automate, endpoint próprio)."
            body={
              <div style={{display:'grid', gap:8}}>
                <input type="url" placeholder="https://hooks.zapier.com/..."
                  value={cfg.webhookUrl || ''}
                  onChange={e => setCfg({...cfg, webhookUrl: e.target.value})}
                  style={{padding:'7px 10px', border:'1px solid var(--line)', borderRadius:6, background:'var(--surface)', fontSize:12.5, fontFamily:'var(--mono)', color:'var(--ink)', outline:'none'}}
                />
                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                  <button className="btn btn-primary" onClick={sendWebhook}>Enviar agora</button>
                  <label style={{display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--ink-3)'}}>
                    <input type="checkbox" checked={cfg.autoSync || false} onChange={e=>setCfg({...cfg, autoSync:e.target.checked})}
                      style={{accentColor:'var(--accent)'}}/>
                    Auto-enviar a cada alteração
                  </label>
                </div>
                {status && <div style={{fontSize:12, color:'var(--ink-2)', fontFamily:'var(--mono)'}}>{status}</div>}
              </div>
            }
          />

          <IntegCard
            title="Microsoft 365 (Planner / To Do / Outlook)"
            desc="Sincronizar com Microsoft Graph API. Requer registro de app no Azure AD e consentimento dos escopos Tasks.ReadWrite, Calendars.ReadWrite."
            body={
              <div style={{display:'grid', gap:8}}>
                <input placeholder="Tenant ID"
                  value={cfg.msTenant || ''} onChange={e=>setCfg({...cfg, msTenant:e.target.value})}
                  style={inputStyle}/>
                <input placeholder="Client ID (Application ID)"
                  value={cfg.msClient || ''} onChange={e=>setCfg({...cfg, msClient:e.target.value})}
                  style={inputStyle}/>
                <div style={{padding:'8px 10px', background:'var(--bg-2)', border:'1px dashed var(--line)', borderRadius:6, fontSize:11.5, color:'var(--ink-3)'}}>
                  <strong style={{color:'var(--ink-2)'}}>Passos para configurar:</strong><br/>
                  1. Azure Portal → App Registrations → New registration<br/>
                  2. Redirect URI: a URL desta página<br/>
                  3. API Permissions: Tasks.ReadWrite, Calendars.ReadWrite (delegated)<br/>
                  4. Preencha os IDs acima e conecte
                </div>
                <button className="btn" disabled style={{opacity:0.6, cursor:'not-allowed'}}>
                  Conectar ao Microsoft 365 (requer configuração)
                </button>
              </div>
            }
          />

          <IntegCard
            title="Google Sheets"
            desc="Espelhar tarefas em uma planilha Google. Use Apps Script com o webhook acima, ou conecte via OAuth."
            body={
              <div style={{padding:'10px 12px', background:'var(--bg-2)', border:'1px dashed var(--line)', borderRadius:6, fontSize:11.5, color:'var(--ink-3)', lineHeight:1.6}}>
                <strong style={{color:'var(--ink-2)'}}>Caminho rápido (sem OAuth):</strong><br/>
                1. Crie uma planilha nova no Google Sheets<br/>
                2. Extensões → Apps Script, cole um handler <span style={{fontFamily:'var(--mono)', background:'var(--surface)', padding:'1px 4px', borderRadius:3}}>doPost(e)</span> que escreve <span style={{fontFamily:'var(--mono)'}}>e.postData.contents</span> nas linhas<br/>
                3. Deploy como Web App → copie a URL e cole no webhook acima<br/>
                <em>Modelo de script disponível sob pedido.</em>
              </div>
            }
          />

        </div>
        <div className="modal-foot">
          <span className="spacer"/>
          <button className="btn btn-primary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
};

const inputStyle = {
  padding:'7px 10px', border:'1px solid var(--line)', borderRadius:6,
  background:'var(--surface)', fontSize:12.5, fontFamily:'var(--mono)',
  color:'var(--ink)', outline:'none',
};

const IntegCard = ({ title, desc, action, body }) => (
  <div style={{
    border:'1px solid var(--line)', borderRadius:'var(--r-md)',
    padding:'14px 16px', marginBottom:12, background:'var(--surface)',
  }}>
    <div style={{display:'flex', alignItems:'flex-start', gap:12, marginBottom: body ? 12 : 0}}>
      <div style={{flex:1}}>
        <div style={{fontWeight:600, fontSize:14, marginBottom:3}}>{title}</div>
        <div style={{fontSize:12.5, color:'var(--ink-3)', lineHeight:1.5}}>{desc}</div>
      </div>
      {action}
    </div>
    {body}
  </div>
);

Object.assign(window, { NotifBell, ViewsMenu, IntegrationModal });
