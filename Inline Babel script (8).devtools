// Settings: gerenciamento de responsáveis e projetos
// Substitui TEAM/PROJECTS (constantes) por leitura dinâmica do localStorage
// com fallback para TEAM_SEED/PROJECTS_SEED.

const TEAM_KEY = 'planner_at_team';
const PROJECTS_KEY = 'planner_at_projects';
const OBJECTIVES_KEY = 'planner_at_objectives';

const loadTeam = () => {
  try { const r = localStorage.getItem(TEAM_KEY); if (r) return JSON.parse(r); } catch(e) {}
  return TEAM_SEED;
};
const loadProjects = () => {
  try { const r = localStorage.getItem(PROJECTS_KEY); if (r) return JSON.parse(r); } catch(e) {}
  return PROJECTS_SEED;
};
const loadObjectives = () => {
  try { const r = localStorage.getItem(OBJECTIVES_KEY); if (r) return JSON.parse(r); } catch(e) {}
  return OBJECTIVES_SEED;
};

// Globais mutáveis
window.TEAM = loadTeam();
window.PROJECTS = loadProjects();
window.OBJECTIVES = loadObjectives();

const makeInitials = (name) => {
  const parts = (name||'').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '??';
  if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
  return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
};

const makeId = (prefix, existing) => {
  let n = 1;
  while (existing.find(x => x.id === `${prefix}${n}`)) n++;
  return `${prefix}${n}`;
};

const SettingsPanel = ({ tasks, onTasksChange, onClose, onDataChange }) => {
  const { useState: uS, useEffect: uE } = React;
  const [team, setTeam] = uS(window.TEAM);
  const [projects, setProjects] = uS(window.PROJECTS);
  const [objectives, setObjectives] = uS(window.OBJECTIVES);
  const [editingTeam, setEditingTeam] = uS(null);
  const [editingProj, setEditingProj] = uS(null);
  const [editingObj, setEditingObj] = uS(null);
  const [newTeamName, setNewTeamName] = uS('');
  const [newTeamRole, setNewTeamRole] = uS('');
  const [newTeamEsc, setNewTeamEsc] = uS('2');
  const [newProjLabel, setNewProjLabel] = uS('');
  const [newProjObj, setNewProjObj] = uS('');
  const [newObjLabel, setNewObjLabel] = uS('');

  const persist = (t, p, o) => {
    localStorage.setItem(TEAM_KEY, JSON.stringify(t));
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(p));
    localStorage.setItem(OBJECTIVES_KEY, JSON.stringify(o));
    window.TEAM = t; window.PROJECTS = p; window.OBJECTIVES = o;
    onDataChange && onDataChange();
  };

  uE(() => persist(team, projects, objectives), [team, projects, objectives]);

  const addMember = () => {
    const name = newTeamName.trim();
    if (!name) return;
    const id = makeId('u', team);
    setTeam([...team, {
      id, name, initials: makeInitials(name),
      role: newTeamRole.trim() || '',
      escalation: Number(newTeamEsc) || 3,
    }]);
    setNewTeamName(''); setNewTeamRole(''); setNewTeamEsc('2');
  };

  const updateMember = (id, patch) => {
    setTeam(team.map(m => m.id === id ? { ...m, ...patch, initials: patch.name ? makeInitials(patch.name) : m.initials } : m));
  };

  const removeMember = (id) => {
    const used = tasks.filter(t => t.assignees.includes(id));
    if (used.length > 0) {
      const others = team.filter(m => m.id !== id);
      const names = others.map(o => `${o.id}=${o.name}`).join('\n');
      const target = prompt(
        `${used.length} tarefa(s) estão atribuídas a este responsável.\n\n` +
        `Digite o ID de outro responsável para transferir, ou deixe em branco para apenas remover a atribuição:\n\n${names}`
      );
      if (target === null) return; // cancelou
      if (target && !others.find(o => o.id === target)) {
        alert('ID inválido. Operação cancelada.');
        return;
      }
      const updated = tasks.map(t => {
        if (!t.assignees.includes(id)) return t;
        const filtered = t.assignees.filter(a => a !== id);
        if (target && !filtered.includes(target)) filtered.push(target);
        return { ...t, assignees: filtered };
      });
      onTasksChange(updated);
    }
    setTeam(team.filter(m => m.id !== id));
  };

  const addProject = () => {
    const label = newProjLabel.trim();
    if (!label) return;
    const id = makeId('p', projects);
    setProjects([...projects, { id, label, objective: newProjObj || null }]);
    setNewProjLabel(''); setNewProjObj('');
  };

  const updateProject = (id, patch) => {
    setProjects(projects.map(p => p.id === id ? { ...p, ...patch } : p));
  };

  const addObjective = () => {
    const label = newObjLabel.trim();
    if (!label) return;
    const id = makeId('obj-', objectives);
    setObjectives([...objectives, { id, label, horizon: 'anual' }]);
    setNewObjLabel('');
  };

  const updateObjective = (id, label) => {
    setObjectives(objectives.map(o => o.id === id ? { ...o, label } : o));
  };

  const removeObjective = (id) => {
    const used = projects.filter(p => p.objective === id);
    if (used.length > 0) {
      if (!confirm(`${used.length} projeto(s) estão vinculados a este objetivo. Remover mesmo assim?`)) return;
      setProjects(projects.map(p => p.objective === id ? { ...p, objective: null } : p));
    }
    setObjectives(objectives.filter(o => o.id !== id));
  };

  const removeProject = (id) => {
    const used = tasks.filter(t => t.project === id);
    if (used.length > 0) {
      const others = projects.filter(p => p.id !== id);
      const list = others.map(o => `${o.id}=${o.label}`).join('\n');
      const target = prompt(
        `${used.length} tarefa(s) pertencem a este projeto.\n\n` +
        `Digite o ID de outro projeto para transferir, ou deixe em branco para remover a associação:\n\n${list}`
      );
      if (target === null) return;
      if (target && !others.find(o => o.id === target)) {
        alert('ID inválido. Operação cancelada.');
        return;
      }
      const updated = tasks.map(t => t.project === id ? { ...t, project: target || null } : t);
      onTasksChange(updated);
    }
    setProjects(projects.filter(p => p.id !== id));
  };

  const rowStyle = {
    display:'flex', alignItems:'center', gap:10,
    padding:'8px 10px', background:'var(--bg-2)',
    borderRadius:6, border:'1px solid var(--line)', marginBottom:6,
  };
  const inputS = {
    padding:'6px 8px', border:'1px solid var(--line)', borderRadius:5,
    background:'var(--surface)', fontSize:12.5, color:'var(--ink)', outline:'none',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:720}}>
        <div className="modal-head">
          <div style={{flex:1}}>
            <div className="code">Configurações</div>
            <div className="title-input" style={{pointerEvents:'none'}}>Responsáveis e projetos</div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{padding:'18px 24px', overflowY:'auto', flex:1, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:20}}>

          {/* RESPONSÁVEIS */}
          <div>
            <div style={{fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ink-3)', marginBottom:10}}>
              Responsáveis · {team.length}
            </div>
            {team.map(m => {
              const editing = editingTeam === m.id;
              const usedCount = tasks.filter(t=>t.assignees.includes(m.id)).length;
              return (
                <div key={m.id} style={rowStyle}>
                  <Avatar id={m.id} size={28}/>
                  <div style={{flex:1, minWidth:0}}>
                    {editing ? (
                      <div style={{display:'grid', gap:4}}>
                        <input value={m.name} onChange={e=>updateMember(m.id,{name:e.target.value})}
                          style={inputS} placeholder="Nome"/>
                        <input value={m.role||''} onChange={e=>updateMember(m.id,{role:e.target.value})}
                          style={inputS} placeholder="Função (ex.: Planejamento, Jurídico, Aprovação)"/>
                        <select value={m.escalation ?? 3} onChange={e=>updateMember(m.id,{escalation:Number(e.target.value)})}
                          style={inputS}>
                          <option value={1}>Nível 1 — Aprovação/Gestão</option>
                          <option value={2}>Nível 2 — Coordenação</option>
                          <option value={3}>Nível 3 — Execução</option>
                        </select>
                      </div>
                    ) : (
                      <>
                        <div style={{fontSize:13, fontWeight:500}}>{m.name}</div>
                        <div style={{fontSize:11, color:'var(--ink-3)'}}>
                          {m.role || '—'} · <span style={{fontFamily:'var(--mono)'}}>N{m.escalation ?? 3}</span> · <span style={{fontFamily:'var(--mono)'}}>{usedCount} tarefa(s)</span>
                        </div>
                      </>
                    )}
                  </div>
                  <button className="icon-btn" style={{width:26, height:26}}
                    onClick={() => setEditingTeam(editing ? null : m.id)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {editing
                        ? <path d="m5 12 5 5L20 7"/>
                        : <><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></>
                      }
                    </svg>
                  </button>
                  <button className="icon-btn" style={{width:26, height:26, color:'var(--p-alta)'}}
                    onClick={() => removeMember(m.id)} disabled={m.id === 'me'}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>
                    </svg>
                  </button>
                </div>
              );
            })}
            <div style={{marginTop:10, padding:10, border:'1px dashed var(--line)', borderRadius:6, display:'grid', gap:6}}>
              <input value={newTeamName} onChange={e=>setNewTeamName(e.target.value)}
                onKeyDown={e => e.key==='Enter' && addMember()}
                placeholder="Nome do responsável" style={inputS}/>
              <input value={newTeamRole} onChange={e=>setNewTeamRole(e.target.value)}
                onKeyDown={e => e.key==='Enter' && addMember()}
                placeholder="Função (ex.: Planejamento, Jurídico, Aprovação)" style={inputS}/>
              <select value={newTeamEsc} onChange={e=>setNewTeamEsc(e.target.value)} style={inputS}>
                <option value="1">Nível 1 — Aprovação/Gestão</option>
                <option value="2">Nível 2 — Coordenação</option>
                <option value="3">Nível 3 — Execução</option>
              </select>
              <button className="btn btn-primary" onClick={addMember} style={{fontSize:12.5}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Adicionar responsável
              </button>
            </div>
          </div>

          {/* OBJETIVOS ESTRATÉGICOS */}
          <div>
            <div style={{fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ink-3)', marginBottom:10}}>
              Objetivos estratégicos · {objectives.length}
            </div>
            {objectives.map(o => {
              const editing = editingObj === o.id;
              const projCount = projects.filter(p => p.objective === o.id).length;
              return (
                <div key={o.id} style={rowStyle}>
                  <div style={{width:8, height:8, borderRadius:2, background:'var(--p-alta)', flexShrink:0}}/>
                  <div style={{flex:1, minWidth:0}}>
                    {editing ? (
                      <input value={o.label} onChange={e=>updateObjective(o.id, e.target.value)}
                        style={{...inputS, width:'100%'}} autoFocus
                        onKeyDown={e=>e.key==='Enter' && setEditingObj(null)}/>
                    ) : (
                      <>
                        <div style={{fontSize:13, fontWeight:500}}>{o.label}</div>
                        <div style={{fontSize:11, color:'var(--ink-3)', fontFamily:'var(--mono)'}}>
                          {o.id} · {projCount} projeto(s)
                        </div>
                      </>
                    )}
                  </div>
                  <button className="icon-btn" style={{width:26, height:26}}
                    onClick={() => setEditingObj(editing ? null : o.id)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {editing ? <path d="m5 12 5 5L20 7"/> : <><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></>}
                    </svg>
                  </button>
                  <button className="icon-btn" style={{width:26, height:26, color:'var(--p-alta)'}}
                    onClick={() => removeObjective(o.id)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>
                    </svg>
                  </button>
                </div>
              );
            })}
            <div style={{marginTop:10, padding:10, border:'1px dashed var(--line)', borderRadius:6, display:'grid', gap:6}}>
              <input value={newObjLabel} onChange={e=>setNewObjLabel(e.target.value)}
                onKeyDown={e => e.key==='Enter' && addObjective()}
                placeholder="Objetivo anual do setor" style={inputS}/>
              <button className="btn btn-primary" onClick={addObjective} style={{fontSize:12.5}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Adicionar objetivo
              </button>
            </div>
            <div style={{marginTop:10, padding:'8px 10px', background:'var(--bg-2)', border:'1px dashed var(--line)', borderRadius:6, fontSize:11, color:'var(--ink-3)', lineHeight:1.5}}>
              Macro → Micro: defina o <strong style={{color:'var(--ink-2)'}}>objetivo anual</strong>, vincule-o a <strong style={{color:'var(--ink-2)'}}>projetos</strong>, e desdobre em <strong style={{color:'var(--ink-2)'}}>tarefas diárias</strong>.
            </div>
          </div>

          {/* PROJETOS */}
          <div>
            <div style={{fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ink-3)', marginBottom:10}}>
              Projetos · {projects.length}
            </div>
            {projects.map(p => {
              const editing = editingProj === p.id;
              const usedCount = tasks.filter(t=>t.project===p.id).length;
              return (
                <div key={p.id} style={rowStyle}>
                  <div style={{width:8, height:8, borderRadius:2, background:'var(--accent)', flexShrink:0}}/>
                  <div style={{flex:1, minWidth:0}}>
                    {editing ? (
                      <div style={{display:'grid', gap:4}}>
                        <input value={p.label} onChange={e=>updateProject(p.id,{label:e.target.value})}
                          style={{...inputS, width:'100%'}} autoFocus
                          onKeyDown={e=>e.key==='Enter' && setEditingProj(null)} placeholder="Nome do projeto"/>
                        <select value={p.objective || ''} onChange={e=>updateProject(p.id,{objective:e.target.value||null})}
                          style={{...inputS, width:'100%'}}>
                          <option value="">— sem objetivo estratégico —</option>
                          {objectives.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </select>
                      </div>
                    ) : (
                      <>
                        <div style={{fontSize:13, fontWeight:500}}>{p.label}</div>
                        <div style={{fontSize:11, color:'var(--ink-3)', fontFamily:'var(--mono)'}}>
                          {p.id} · {usedCount} tarefa(s)
                          {p.objective && <span style={{color:'var(--accent-ink)'}}> · {objectives.find(o=>o.id===p.objective)?.label}</span>}
                        </div>
                      </>
                    )}
                  </div>
                  <button className="icon-btn" style={{width:26, height:26}}
                    onClick={() => setEditingProj(editing ? null : p.id)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {editing ? <path d="m5 12 5 5L20 7"/> : <><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></>}
                    </svg>
                  </button>
                  <button className="icon-btn" style={{width:26, height:26, color:'var(--p-alta)'}}
                    onClick={() => removeProject(p.id)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>
                    </svg>
                  </button>
                </div>
              );
            })}
            <div style={{marginTop:10, padding:10, border:'1px dashed var(--line)', borderRadius:6, display:'grid', gap:6}}>
              <input value={newProjLabel} onChange={e=>setNewProjLabel(e.target.value)}
                onKeyDown={e => e.key==='Enter' && addProject()}
                placeholder="Nome do projeto" style={inputS}/>
              <select value={newProjObj} onChange={e=>setNewProjObj(e.target.value)} style={inputS}>
                <option value="">— sem objetivo estratégico —</option>
                {objectives.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              <button className="btn btn-primary" onClick={addProject} style={{fontSize:12.5}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Adicionar projeto
              </button>
            </div>
          </div>

        </div>
        <div className="modal-foot">
          <span style={{fontSize:11.5, color:'var(--ink-3)'}}>Alterações salvas automaticamente</span>
          <span className="spacer"/>
          <button className="btn btn-primary" onClick={onClose}>Concluir</button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { SettingsPanel, loadTeam, loadProjects, loadObjectives });
