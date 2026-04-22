// Hooks reutilizáveis: histórico (undo/redo), toasts, atalhos de teclado
const { useState: useSH, useEffect: useEH, useCallback: useCH, useRef: useRH, useMemo: useMH } = React;

/* ============= HISTÓRICO (UNDO/REDO) ============= */
// Wrap de useState que mantém past/future e permite undo/redo.
// Retorna [value, set, { undo, redo, canUndo, canRedo, reset }]
const useHistory = (initializer, limit = 50) => {
  const init = typeof initializer === 'function' ? initializer() : initializer;
  const [state, setState] = useSH({ past: [], present: init, future: [] });

  const set = useCH((next, opts = {}) => {
    setState((s) => {
      const value = typeof next === 'function' ? next(s.present) : next;
      // Se marcado replace, não empilha no histórico (ex: edição em textarea).
      if (opts.replace) return { ...s, present: value };
      // Se o valor é idêntico por referência, não empilha.
      if (value === s.present) return s;
      const past = [...s.past, s.present];
      // Limita tamanho
      if (past.length > limit) past.shift();
      return { past, present: value, future: [] };
    });
  }, [limit]);

  const undo = useCH(() => {
    setState((s) => {
      if (s.past.length === 0) return s;
      const prev = s.past[s.past.length - 1];
      return {
        past: s.past.slice(0, -1),
        present: prev,
        future: [s.present, ...s.future],
      };
    });
  }, []);

  const redo = useCH(() => {
    setState((s) => {
      if (s.future.length === 0) return s;
      const next = s.future[0];
      return {
        past: [...s.past, s.present],
        present: next,
        future: s.future.slice(1),
      };
    });
  }, []);

  const reset = useCH((value) => {
    setState({ past: [], present: value, future: [] });
  }, []);

  return [state.present, set, {
    undo, redo, reset,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  }];
};

/* ============= TOASTS ============= */
// Fila global simples via event bus (window) — qualquer componente pode disparar.
// API: window.toast('Mensagem'), window.toast({ msg, kind: 'success'|'error'|'info', action: {label, onClick} })
const ToastHost = () => {
  const [items, setItems] = useSH([]);
  const idRef = useRH(0);

  useEH(() => {
    const handler = (e) => {
      const { detail } = e;
      const id = ++idRef.current;
      const item = typeof detail === 'string' ? { id, msg: detail, kind: 'info' } : { id, kind: 'info', ...detail };
      setItems((arr) => [...arr, item]);
      const ttl = item.ttl ?? 4000;
      if (ttl > 0) {
        setTimeout(() => {
          setItems((arr) => arr.filter((x) => x.id !== id));
        }, ttl);
      }
    };
    window.addEventListener('__toast', handler);
    // Expõe função global
    window.toast = (payload) => window.dispatchEvent(new CustomEvent('__toast', { detail: payload }));
    return () => window.removeEventListener('__toast', handler);
  }, []);

  const dismiss = (id) => setItems((arr) => arr.filter((x) => x.id !== id));

  return (
    <div className="toast-host">
      {items.map((t) => (
        <div key={t.id} className={'toast toast-' + t.kind}>
          <div className="toast-icon">
            {t.kind === 'success' && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            )}
            {t.kind === 'error' && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            )}
            {t.kind === 'info' && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            )}
          </div>
          <div className="toast-msg">{t.msg}</div>
          {t.action && (
            <button className="toast-action" onClick={() => { t.action.onClick(); dismiss(t.id); }}>
              {t.action.label}
            </button>
          )}
          <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Fechar">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      ))}
    </div>
  );
};

const toast = (payload) => {
  // Safe even se ainda não montou
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('__toast', { detail: payload }));
  }
};

/* ============= ATALHOS DE TECLADO ============= */
// useHotkeys({ 'mod+z': fn, 'mod+shift+z': fn, 'n': fn, '/': fn, 'esc': fn }, deps)
const normalizeKey = (e) => {
  const parts = [];
  if (e.metaKey || e.ctrlKey) parts.push('mod');
  if (e.shiftKey) parts.push('shift');
  if (e.altKey) parts.push('alt');
  const key = e.key.toLowerCase();
  // ignora quando combo é só modificador
  if (!['control','shift','alt','meta'].includes(key)) parts.push(key === ' ' ? 'space' : key);
  return parts.join('+');
};

const useHotkeys = (bindings, deps = []) => {
  const bindingsRef = useRH(bindings);
  useEH(() => { bindingsRef.current = bindings; }, deps);

  useEH(() => {
    const handler = (e) => {
      // Não interceptar quando usuário digita em campos, exceto algumas teclas globais
      const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
      const combo = normalizeKey(e);

      // Atalhos permitidos mesmo em campos
      const allowInField = ['escape', 'mod+z', 'mod+shift+z', 'mod+y', 'mod+k', 'mod+enter'];
      if (inField && !allowInField.includes(combo)) return;

      const fn = bindingsRef.current[combo];
      if (fn) {
        e.preventDefault();
        fn(e);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
};

/* ============= HOTKEYS HELP MODAL ============= */
const HotkeysHelp = ({ onClose }) => {
  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);
  const mod = isMac ? '⌘' : 'Ctrl';
  return (
    <div className="hotkeys-modal" onClick={onClose}>
      <div className="hotkeys-panel" onClick={e => e.stopPropagation()}>
        <h2>Atalhos de teclado</h2>
        <div className="hk-section-title">Navegação</div>
        <ul className="hk-list">
          <li><span>Nova tarefa</span><span><kbd>N</kbd></span></li>
          <li><span>Ir para Kanban</span><span><kbd>K</kbd></span></li>
          <li><span>Ir para Timeline</span><span><kbd>T</kbd></span></li>
          <li><span>Focar busca</span><span><kbd>/</kbd> <kbd>{mod}+K</kbd></span></li>
          <li><span>Fechar modal / cancelar</span><span><kbd>Esc</kbd></span></li>
          <li><span>Esta ajuda</span><span><kbd>?</kbd></span></li>
        </ul>
        <div className="hk-section-title">Edição</div>
        <ul className="hk-list">
          <li><span>Desfazer</span><span><kbd>{mod}+Z</kbd></span></li>
          <li><span>Refazer</span><span><kbd>{mod}+⇧+Z</kbd> <kbd>{mod}+Y</kbd></span></li>
        </ul>
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <button className="btn" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { useHistory, ToastHost, toast, useHotkeys, HotkeysHelp });
