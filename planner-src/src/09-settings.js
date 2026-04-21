// Settings: gerenciamento de responsáveis e projetos
// Substitui TEAM/PROJECTS (constantes) por leitura dinâmica do localStorage
// com fallback para TEAM_SEED/PROJECTS_SEED.

const TEAM_KEY = 'planner_at_team';
const PROJECTS_KEY = 'planner_at_projects';

const loadTeam = () => {
  try { const r = localStorage.getItem(TEAM_KEY); if (r) return JSON.parse(r); } catch(e) {}
  return TEAM_SEED;
};
const loadProjects = () => {
  try { const r = localStorage.getItem(PROJECTS_KEY); if (r) return JSON.parse(r); } catch(e) {}
  return PROJECTS_SEED;
};

// Globais mutáveis
window.TEAM = loadTeam();
window.PROJECTS = loadProjects();

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
  const [tab, uTab] = [null, null]; // not needed
  const [team, setTeam] = uS(window.TEAM);
  const [projects, setProjects] = uS(window.PROJECTS);
  const [editingTeam, setEditingTeam] = uS(null); // id
  const [editingProj, setEditingProj] = uS(null);
  const [newTeamName, setNewTeamName] = uS('');
  const [newTeamRole, setNewTeamRole] = uS('');
  const [newProjLabel, setNewProjLabel] = uS('');

  const persist = (t, p) => {
    localStorage.setItem(TEAM_KEY, JSON.stringify(t));
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(p));
    window.TEAM = t; window.PROJECTS = p;
    onDataChange && onDataChange();
  };

  uE(() => persist(team, projects), [team, projects]);

  const addMember = () => {
    const name = newTeamName.trim();
    if (!name) return;
    const id = makeId('u', team);
    setTeam([...team, { id, name, initials: makeInitials(name), role: newTeamRole.trim() || '' }]);
    setNewTeamName(''); setNewTeamRole('');
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
    setProjects([...projects, { id, label }]);
    setNewProjLabel('');
  };

  const updateProject = (id, label) => {
    setProjects(projects.map(p => p.id === id ? { ...p, label } : p));
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
        <div style={{padding:'18px 24px', overflowY:'auto', flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}>

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
                          style={inputS} placeholder="Função"/>
                      </div>
                    ) : (
                      <>
                        <div style={{fontSize:13, fontWeight:500}}>{m.name}</div>
                        <div style={{fontSize:11, color:'var(--ink-3)'}}>
                          {m.role || '—'} · <span style={{fontFamily:'var(--mono)'}}>{usedCount} tarefa(s)</span>
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
                placeholder="Função (opcional)" style={inputS}/>
              <button className="btn btn-primary" onClick={addMember} style={{fontSize:12.5}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Adicionar responsável
              </button>
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
                      <input value={p.label} onChange={e=>updateProject(p.id,e.target.value)}
                        style={{...inputS, width:'100%'}} autoFocus
                        onKeyDown={e=>e.key==='Enter' && setEditingProj(null)}/>
                    ) : (
                      <>
                        <div style={{fontSize:13, fontWeight:500}}>{p.label}</div>
                        <div style={{fontSize:11, color:'var(--ink-3)', fontFamily:'var(--mono)'}}>
                          {p.id} · {usedCount} tarefa(s)
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

Object.assign(window, { SettingsPanel, loadTeam, loadProjects });
