// Sync: arquivo JSON (import/export) + File System Access API (auto-save)
const { useState: useSS, useEffect: useES, useRef: useRS } = React;

const FS_HANDLE_KEY = 'planner_at_fs_handle';
const FS_SUPPORTED = typeof window !== 'undefined' && 'showSaveFilePicker' in window;

// IndexedDB mínimo para guardar o FileSystemHandle (não serializa em localStorage)
const idbSet = (key, val) => new Promise((res, rej) => {
  const open = indexedDB.open('planner_at', 1);
  open.onupgradeneeded = () => open.result.createObjectStore('kv');
  open.onsuccess = () => {
    const tx = open.result.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(val, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  };
  open.onerror = () => rej(open.error);
});
const idbGet = (key) => new Promise((res, rej) => {
  const open = indexedDB.open('planner_at', 1);
  open.onupgradeneeded = () => open.result.createObjectStore('kv');
  open.onsuccess = () => {
    const tx = open.result.transaction('kv', 'readonly');
    const req = tx.objectStore('kv').get(key);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  };
  open.onerror = () => rej(open.error);
});
const idbDel = (key) => new Promise((res, rej) => {
  const open = indexedDB.open('planner_at', 1);
  open.onupgradeneeded = () => open.result.createObjectStore('kv');
  open.onsuccess = () => {
    const tx = open.result.transaction('kv', 'readwrite');
    tx.objectStore('kv').delete(key);
    tx.oncomplete = () => res();
  };
});

const exportJSON = (tasks) => {
  const payload = { version: 1, exportedAt: new Date().toISOString(), tasks };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `planner-at-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(url);
};

const importJSONFile = () => new Promise((resolve, reject) => {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'application/json,.json';
  input.onchange = () => {
    const file = input.files[0];
    if (!file) return reject('Nenhum arquivo');
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (Array.isArray(data)) resolve(data);
        else if (Array.isArray(data.tasks)) resolve(data.tasks);
        else reject('Formato inválido');
      } catch(e) { reject(e.message); }
    };
    r.readAsText(file);
  };
  input.click();
});

const SyncPanel = ({ tasks, onImport, onClose }) => {
  const [linked, setLinked] = useSS(null);
  const [status, setStatus] = useSS('');
  const [autoSync, setAutoSync] = useSS(() => localStorage.getItem('planner_at_autosync') === '1');

  useES(() => {
    idbGet(FS_HANDLE_KEY).then(h => {
      if (h) setLinked({ name: h.name });
    });
  }, []);
  useES(() => {
    localStorage.setItem('planner_at_autosync', autoSync ? '1' : '0');
  }, [autoSync]);

  const linkFile = async () => {
    if (!FS_SUPPORTED) { setStatus('⚠ Use Chrome ou Edge para este recurso'); return; }
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'planner-at.json',
        types: [{ description: 'Planner AT', accept: { 'application/json': ['.json'] }}],
      });
      await idbSet(FS_HANDLE_KEY, handle);
      setLinked({ name: handle.name });
      setStatus(`✓ Arquivo vinculado: ${handle.name}`);
      // grava versão inicial
      await writeToHandle(handle, tasks);
    } catch(e) {
      if (e.name !== 'AbortError') setStatus('✗ ' + e.message);
    }
  };

  const openExisting = async () => {
    if (!FS_SUPPORTED) { setStatus('⚠ Use Chrome ou Edge para este recurso'); return; }
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'Planner AT', accept: { 'application/json': ['.json'] }}],
      });
      const perm = await handle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') { setStatus('✗ Permissão negada'); return; }
      const file = await handle.getFile();
      const text = await file.text();
      const data = JSON.parse(text);
      const imported = Array.isArray(data) ? data : data.tasks;
      if (imported) {
        onImport(imported);
        await idbSet(FS_HANDLE_KEY, handle);
        setLinked({ name: handle.name });
        setStatus(`✓ Dados carregados de ${handle.name}`);
      }
    } catch(e) {
      if (e.name !== 'AbortError') setStatus('✗ ' + e.message);
    }
  };

  const unlink = async () => {
    await idbDel(FS_HANDLE_KEY);
    setLinked(null); setAutoSync(false);
    setStatus('✓ Vínculo removido');
  };

  const manualSave = async () => {
    const handle = await idbGet(FS_HANDLE_KEY);
    if (!handle) { setStatus('⚠ Vincule um arquivo primeiro'); return; }
    try {
      await writeToHandle(handle, tasks);
      setStatus(`✓ Salvo em ${handle.name} às ${new Date().toLocaleTimeString('pt-BR')}`);
    } catch(e) {
      if (e.name === 'NotAllowedError') {
        // precisa re-pedir permissão
        const perm = await handle.requestPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          await writeToHandle(handle, tasks);
          setStatus('✓ Salvo (permissão renovada)');
        } else {
          setStatus('✗ Permissão negada');
        }
      } else {
        setStatus('✗ ' + e.message);
      }
    }
  };

  const doExport = () => { exportJSON(tasks); setStatus('✓ Arquivo JSON baixado'); };
  const doImport = async () => {
    try {
      const imported = await importJSONFile();
      if (confirm(`Importar ${imported.length} tarefa(s)? Os dados atuais serão substituídos.`)) {
        onImport(imported);
        setStatus(`✓ ${imported.length} tarefa(s) importada(s)`);
      }
    } catch(e) { setStatus('✗ ' + e); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:620}}>
        <div className="modal-head">
          <div style={{flex:1}}>
            <div className="code">Armazenamento</div>
            <div className="title-input" style={{pointerEvents:'none'}}>Onde seus dados ficam</div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{padding:'18px 24px', overflowY:'auto', flex:1}}>

          <div style={{padding:'10px 14px', background:'var(--bg-2)', borderRadius:8, fontSize:12.5, color:'var(--ink-3)', marginBottom:16, lineHeight:1.6}}>
            Por padrão, seus dados ficam salvos no <strong style={{color:'var(--ink-2)'}}>navegador deste PC</strong> (localStorage).
            Para ter backup, transportar entre computadores ou sincronizar via OneDrive/Google Drive,
            use uma das opções abaixo.
          </div>

          {/* Auto-save em arquivo */}
          <div style={{border:'1px solid var(--line)', borderRadius:10, padding:'14px 16px', marginBottom:14, background:'var(--surface)'}}>
            <div style={{display:'flex', alignItems:'flex-start', gap:12}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:600, fontSize:14, marginBottom:3, display:'flex', alignItems:'center', gap:8}}>
                  Auto-salvar em arquivo
                  {FS_SUPPORTED
                    ? <span style={{fontSize:10, padding:'2px 6px', borderRadius:4, background:'var(--accent-wash)', color:'var(--accent-ink)', fontWeight:500}}>Recomendado</span>
                    : <span style={{fontSize:10, padding:'2px 6px', borderRadius:4, background:'var(--bg-2)', color:'var(--ink-3)'}}>Chrome/Edge</span>
                  }
                </div>
                <div style={{fontSize:12.5, color:'var(--ink-3)', lineHeight:1.5}}>
                  Aponte um arquivo em <code style={{fontFamily:'var(--mono)', background:'var(--bg-2)', padding:'1px 5px', borderRadius:3}}>OneDrive/Planner/dados.json</code>.
                  A cada alteração, o app grava nele automaticamente. O OneDrive sincroniza sozinho.
                </div>
              </div>
            </div>

            {linked ? (
              <div style={{marginTop:12, padding:'10px 12px', background:'var(--accent-wash)', border:'1px solid var(--accent-line)', borderRadius:8, display:'flex', alignItems:'center', gap:10}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink)" strokeWidth="2" strokeLinecap="round"><path d="m5 12 5 5L20 7"/></svg>
                <span style={{flex:1, fontSize:12.5, color:'var(--accent-ink)', fontFamily:'var(--mono)'}}>
                  Vinculado: <strong>{linked.name}</strong>
                </span>
                <label style={{display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--accent-ink)'}}>
                  <input type="checkbox" checked={autoSync} onChange={e=>setAutoSync(e.target.checked)}
                    style={{accentColor:'var(--accent)'}}/>
                  auto-sync
                </label>
                <button className="btn" onClick={manualSave} style={{fontSize:12}}>Salvar agora</button>
                <button className="btn btn-ghost" onClick={unlink} style={{fontSize:12}}>Desvincular</button>
              </div>
            ) : (
              <div style={{marginTop:12, display:'flex', gap:8, flexWrap:'wrap'}}>
                <button className="btn btn-primary" onClick={linkFile} disabled={!FS_SUPPORTED}>
                  Criar novo arquivo…
                </button>
                <button className="btn" onClick={openExisting} disabled={!FS_SUPPORTED}>
                  Abrir arquivo existente…
                </button>
              </div>
            )}

            <div style={{marginTop:10, padding:'8px 12px', background:'var(--bg-2)', border:'1px dashed var(--line)', borderRadius:6, fontSize:11.5, color:'var(--ink-3)', lineHeight:1.6}}>
              <strong style={{color:'var(--ink-2)'}}>Dica:</strong> aponte para a pasta do OneDrive sincronizada localmente (ex: <code style={{fontFamily:'var(--mono)'}}>C:\Users\você\OneDrive\Planner\dados.json</code>). O Windows mantém o arquivo sincronizado com a nuvem automaticamente.<br/>
              <em style={{opacity:0.8}}>O navegador pode pedir permissão de novo ao reabrir o app — é limitação de segurança do Chrome/Edge.</em>
            </div>
          </div>

          {/* Import/Export manual */}
          <div style={{border:'1px solid var(--line)', borderRadius:10, padding:'14px 16px', marginBottom:14, background:'var(--surface)'}}>
            <div style={{fontWeight:600, fontSize:14, marginBottom:3}}>Backup manual (funciona em qualquer navegador)</div>
            <div style={{fontSize:12.5, color:'var(--ink-3)', marginBottom:12, lineHeight:1.5}}>
              Baixa/carrega um arquivo <code style={{fontFamily:'var(--mono)', background:'var(--bg-2)', padding:'1px 5px', borderRadius:3}}>.json</code> com todas as tarefas.
              Use para transportar dados entre PCs, ou salvar cópias de segurança.
            </div>
            <div style={{display:'flex', gap:8}}>
              <button className="btn btn-primary" onClick={doExport}>Exportar JSON</button>
              <button className="btn" onClick={doImport}>Importar JSON…</button>
            </div>
          </div>

          {status && (
            <div style={{padding:'10px 12px', background:'var(--bg-2)', borderRadius:6, fontSize:12.5, fontFamily:'var(--mono)', color:'var(--ink-2)'}}>
              {status}
            </div>
          )}
        </div>
        <div className="modal-foot">
          <span className="spacer"/>
          <button className="btn btn-primary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
};

const writeToHandle = async (handle, tasks) => {
  const writable = await handle.createWritable();
  const payload = { version: 1, exportedAt: new Date().toISOString(), tasks };
  await writable.write(JSON.stringify(payload, null, 2));
  await writable.close();
};

// Hook pra auto-save externo (usado pelo App)
const useAutoFileSync = (tasks) => {
  const lastRef = useRS(null);
  useES(() => {
    if (localStorage.getItem('planner_at_autosync') !== '1') return;
    const t = JSON.stringify(tasks);
    if (lastRef.current === t) return;
    lastRef.current = t;

    const timer = setTimeout(async () => {
      try {
        const handle = await idbGet(FS_HANDLE_KEY);
        if (!handle) return;
        // Verifica permissão silenciosamente
        const perm = await handle.queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted') return; // espera próxima interação
        await writeToHandle(handle, tasks);
      } catch(e) { /* silencioso */ }
    }, 800);
    return () => clearTimeout(timer);
  }, [tasks]);
};

Object.assign(window, { SyncPanel, useAutoFileSync, exportJSON, importJSONFile, FS_SUPPORTED });
