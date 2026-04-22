// Log de auditoria — registra ações sobre tarefas
const AUDIT_KEY = 'planner_at_audit';
const AUDIT_MAX = 200;

const loadAudit = () => {
  try {
    const r = localStorage.getItem(AUDIT_KEY);
    if (r) return JSON.parse(r);
  } catch (e) {}
  return [];
};

const appendAudit = (entry) => {
  const log = loadAudit();
  log.unshift({ id: 'a' + Date.now(), ts: new Date().toISOString(), ...entry });
  if (log.length > AUDIT_MAX) log.length = AUDIT_MAX;
  try { localStorage.setItem(AUDIT_KEY, JSON.stringify(log)); } catch (e) {}
};

const ACTION_LABELS = {
  create:  'Criada',
  update:  'Atualizada',
  delete:  'Excluída',
  move:    'Movida',
  resize:  'Datas alteradas',
};

const ACTION_COLORS = {
  create:  'var(--s-done)',
  update:  'var(--accent)',
  delete:  'var(--p-alta)',
  move:    'var(--p-media)',
  resize:  'var(--ink-3)',
};

const AuditPanel = ({ onClose }) => {
  const { useState: uS, useMemo: uM } = React;
  const [log, setLog] = uS(() => loadAudit());
  const [filter, setFilter] = uS('');

  const filtered = uM(() => {
    if (!filter) return log;
    const q = filter.toLowerCase();
    return log.filter(e =>
      e.taskId?.toLowerCase().includes(q) ||
      e.taskTitle?.toLowerCase().includes(q) ||
      e.detail?.toLowerCase().includes(q) ||
      ACTION_LABELS[e.action]?.toLowerCase().includes(q)
    );
  }, [log, filter]);

  const clearLog = () => {
    if (!window.confirm('Remover todas as entradas do log de auditoria?')) return;
    localStorage.removeItem(AUDIT_KEY);
    setLog([]);
  };

  const formatTs = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' }) +
      ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
        <div className="modal-head">
          <div style={{ flex: 1 }}>
            <div className="code">Log de Auditoria · {log.length} registros</div>
            <div className="title-input" style={{ pointerEvents: 'none' }}>Histórico de alterações</div>
          </div>
          <button className="modal-close" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="search"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filtrar por ID, título, ação…"
            style={{
              flex: 1, padding: '7px 12px',
              border: '1px solid var(--line)', borderRadius: 8,
              background: 'var(--bg-2)', fontSize: 13, outline: 'none',
            }}
          />
          <button className="btn btn-ghost" style={{ fontSize: 12, color: 'var(--p-alta)', flexShrink: 0 }} onClick={clearLog}>
            <Icon name="trash" size={12} /> Limpar log
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.length === 0 && (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
              {filter ? 'Nenhuma entrada encontrada.' : 'Nenhuma ação registrada ainda.'}
            </div>
          )}
          {filtered.map((entry, idx) => (
            <div key={entry.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '10px 24px',
              borderBottom: idx < filtered.length - 1 ? '1px solid var(--line)' : 'none',
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                background: ACTION_COLORS[entry.action] || 'var(--ink-3)',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 10,
                    padding: '1px 6px', borderRadius: 4,
                    background: 'var(--bg-2)', border: '1px solid var(--line)',
                    color: ACTION_COLORS[entry.action] || 'var(--ink-3)',
                    flexShrink: 0,
                  }}>
                    {ACTION_LABELS[entry.action] || entry.action}
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)' }}>
                    {entry.taskId}
                  </span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', flexShrink: 0 }}>
                    {formatTs(entry.ts)}
                  </span>
                </div>
                {entry.taskTitle && (
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.taskTitle}
                  </div>
                )}
                {entry.detail && (
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{entry.detail}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="modal-foot">
          <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
            {filtered.length} de {log.length} entradas
          </span>
          <span className="spacer" />
          <button className="btn btn-primary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { appendAudit, AuditPanel });
