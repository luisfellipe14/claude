// Modal de detalhes / edição da tarefa
const { useState: useStateM, useEffect: useEffectM } = React;

const TaskModal = ({ task, onClose, onSave, onDelete }) => {
  const [draft, setDraft] = useStateM(task);
  useEffectM(() => setDraft(task), [task?.id]);

  if (!task || !draft) return null;

  const update = (patch) => setDraft({ ...draft, ...patch });
  const toggleAssignee = (id) => {
    const has = draft.assignees.includes(id);
    update({ assignees: has ? draft.assignees.filter(a => a !== id) : [...draft.assignees, id] });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div style={{flex:1}}>
            <div className="code">
              {draft.id} · {PROJECTS.find(p => p.id === draft.project)?.label || '—'}
              {draft.recurrent && <span style={{marginLeft:8}}><Icon name="repeat" size={11}/> {
                draft.recurrent === 'weekly' ? 'semanal' :
                draft.recurrent === 'monthly' ? 'mensal' :
                draft.recurrent === 'quarterly' ? 'trimestral' : draft.recurrent
              }</span>}
            </div>
            <input
              className="title-input"
              value={draft.title}
              onChange={e => update({title: e.target.value})}
              placeholder="Título da tarefa"
            />
          </div>
          <button className="modal-close" onClick={onClose}><Icon name="x" size={16}/></button>
        </div>

        <div className="modal-body">
          <div className="modal-main">
            <div className="field">
              <label className="field-label">Descrição</label>
              <textarea
                value={draft.desc || ''}
                onChange={e => update({desc: e.target.value})}
                placeholder="Contexto, critérios de aceite, referências…"
              />
            </div>

            <div className="field">
              <label className="field-label">Progresso · {draft.progress}%</label>
              <input
                type="range" min="0" max="100" step="5"
                value={draft.progress}
                onChange={e => update({progress: Number(e.target.value)})}
                style={{width:'100%', accentColor:'var(--accent)'}}
              />
            </div>

            <div className="field">
              <label className="field-label">Tags</label>
              <input
                type="text"
                value={draft.tags.join(', ')}
                onChange={e => update({tags: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})}
                placeholder="separadas por vírgula"
              />
            </div>

            <div className="field">
              <label className="field-label">
                Subtarefas
                {draft.subtasks?.length > 0 && (
                  <span style={{marginLeft:8, fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-3)', textTransform:'none', letterSpacing:0}}>
                    {draft.subtasks.filter(s=>s.done).length}/{draft.subtasks.length}
                  </span>
                )}
              </label>
              <div style={{display:'grid', gap:4}}>
                {(draft.subtasks || []).map((s, i) => (
                  <div key={s.id} style={{display:'flex', alignItems:'center', gap:8, padding:'6px 8px', background:'var(--bg-2)', borderRadius:6, border:'1px solid var(--line)'}}>
                    <input
                      type="checkbox" checked={s.done}
                      onChange={() => {
                        const next = [...draft.subtasks];
                        next[i] = { ...s, done: !s.done };
                        update({ subtasks: next });
                      }}
                      style={{accentColor:'var(--accent)', width:14, height:14, cursor:'pointer'}}
                    />
                    <input
                      type="text" value={s.text}
                      onChange={e => {
                        const next = [...draft.subtasks];
                        next[i] = { ...s, text: e.target.value };
                        update({ subtasks: next });
                      }}
                      style={{
                        flex:1, border:'none', background:'transparent', outline:'none',
                        fontSize:12.5,
                        textDecoration: s.done ? 'line-through' : 'none',
                        color: s.done ? 'var(--ink-3)' : 'var(--ink)',
                      }}
                    />
                    <button className="icon-btn" style={{width:22, height:22}}
                      onClick={() => update({ subtasks: draft.subtasks.filter((_,x)=>x!==i) })}>
                      <Icon name="x" size={12}/>
                    </button>
                  </div>
                ))}
                <button className="btn btn-ghost" style={{justifyContent:'flex-start', fontSize:12, padding:'6px 8px'}}
                  onClick={() => update({ subtasks: [...(draft.subtasks||[]), { id: 's'+Date.now(), text:'', done:false }] })}>
                  <Icon name="plus" size={12}/> Adicionar subtarefa
                </button>
              </div>
            </div>

            {draft.comments?.length > 0 && (
              <div className="field">
                <label className="field-label">Histórico</label>
                <div style={{display:'grid', gap:10, marginTop:6}}>
                  {draft.comments.map((c, i) => (
                    <div key={i} style={{display:'flex', gap:10, fontSize:12.5}}>
                      <Avatar id={c.who} size={24}/>
                      <div style={{flex:1, background:'var(--bg-2)', padding:'8px 10px', borderRadius:8, border:'1px solid var(--line)'}}>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:2}}>
                          <strong style={{fontSize:12}}>{TEAM.find(t=>t.id===c.who)?.name}</strong>
                          <span style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-3)'}}>
                            {new Date(c.when).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})}
                          </span>
                        </div>
                        {c.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="modal-side">
            <div className="side-section">
              <div className="side-title">Status</div>
              <div className="status-select">
                {STATUSES.map(s => (
                  <div
                    key={s.id}
                    className={'status-opt' + (draft.status === s.id ? ' on' : '')}
                    onClick={() => update({status: s.id})}
                  >
                    <span className="dot" style={{background: s.color}}/>
                    {s.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="side-section">
              <div className="side-title">Prioridade</div>
              <div className="pri-select">
                {PRIORITIES.map(p => (
                  <div
                    key={p.id}
                    className={'pri-opt ' + p.id + (draft.priority === p.id ? ' on' : '')}
                    onClick={() => update({priority: p.id})}
                  >
                    {p.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="side-section">
              <div className="side-title">Responsáveis</div>
              <div className="assignee-picker">
                {TEAM.map(p => (
                  <div
                    key={p.id}
                    className={'assignee-opt' + (draft.assignees.includes(p.id) ? ' on' : '')}
                    onClick={() => toggleAssignee(p.id)}
                  >
                    <Avatar id={p.id} size={22}/>
                    {p.name}
                  </div>
                ))}
              </div>
            </div>

            <div className="side-section">
              <div className="side-title">Projeto</div>
              <select className="select" style={{width:'100%'}}
                value={draft.project || ''}
                onChange={e => update({project: e.target.value})}>
                <option value="">—</option>
                {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>

            <div className="side-section">
              <div className="side-title">Datas</div>
              <div style={{display:'grid', gap:8}}>
                <div>
                  <label style={{fontSize:11, color:'var(--ink-3)'}}>Início</label>
                  <input type="date" value={draft.start} onChange={e => update({start: e.target.value})}
                    style={{width:'100%', padding:'6px 8px', border:'1px solid var(--line)', borderRadius:6, background:'var(--surface)', fontSize:12}}/>
                </div>
                <div>
                  <label style={{fontSize:11, color:'var(--ink-3)'}}>Conclusão</label>
                  <input type="date" value={draft.due} onChange={e => update({due: e.target.value})}
                    style={{width:'100%', padding:'6px 8px', border:'1px solid var(--line)', borderRadius:6, background:'var(--surface)', fontSize:12}}/>
                </div>
              </div>
            </div>

            <div className="side-section">
              <div className="side-title">Recorrência</div>
              <select className="select" style={{width:'100%'}}
                value={draft.recurrent || ''}
                onChange={e => update({recurrent: e.target.value || null})}>
                <option value="">Não recorrente</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
                <option value="quarterly">Trimestral</option>
              </select>
            </div>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={() => onDelete(draft.id)}>
            <Icon name="trash" size={14}/> Excluir
          </button>
          <span className="spacer"/>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onSave(draft)}>
            <Icon name="check" size={14}/> Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { TaskModal });
