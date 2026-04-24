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

// ─── Importador CSV da lista SharePoint "Gestão de OS" ────────────────────────
// Lê o CSV exportado pela lista (All Items → Export → CSV) e converte cada linha
// numa tarefa do Planner. Fonte da lista:
// https://energisa.sharepoint.com/sites/PlanejamentoEMT/Lists/Gesto%20de%20OS

// Parser de CSV resiliente: aspas duplas, campos com quebra de linha, BOM,
// separador auto-detectado (`,` padrão; `;` comum em exports pt-BR).
const parseCSV = (text) => {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const firstNl = text.indexOf('\n');
  const head = firstNl >= 0 ? text.slice(0, firstNl) : text;
  const commas = (head.match(/,/g) || []).length;
  const semis = (head.match(/;/g) || []).length;
  const sep = semis > commas ? ';' : ',';
  const rows = []; let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i+1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === sep) { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
};

const normStr = (s) => (s || '').toString().trim()
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// dd/mm/yyyy | yyyy-mm-dd | ISO timestamp → yyyy-mm-dd
const parseDate = (s) => {
  if (!s) return null;
  const t = s.toString().trim(); if (!t) return null;
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(t);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
};

const mapStatus = (raw, fluxo) => {
  const s = normStr(raw) + ' ' + normStr(fluxo);
  if (/cancel/.test(s)) return 'cancel';
  if (/final|conclu|aprovad|enviad/.test(s)) return 'done';
  if (/aguard|pendent|valida|aprovac/.test(s)) return 'review';
  if (/estudo|analise|execu|andament|progress/.test(s)) return 'progress';
  return 'todo';
};

const mapImpact = (nivel) => {
  const s = normStr(nivel);
  if (/n?\s*4|diretor|president/.test(s)) return 'alto';
  if (/n?\s*3/.test(s)) return 'alto';
  if (/n?\s*2/.test(s)) return 'medio';
  if (/n?\s*1/.test(s)) return 'baixo';
  return 'medio';
};

const derivePriority = (due) => {
  if (!due) return 'media';
  const today = new Date(); today.setHours(0,0,0,0);
  const dd = new Date(due); const diff = (dd - today) / 86400000;
  if (diff <= 7) return 'alta';
  if (diff <= 30) return 'media';
  return 'baixa';
};

const progressFromStatus = (st) => ({todo:0, progress:40, review:80, done:100, cancel:0}[st] ?? 0);

// Match fuzzy por nome contra window.TEAM. Retorna {matched:[ids], unmatched:[names]}
// Cada entrada em `rawList` pode conter múltiplos nomes separados por `,` `;` ou ` e `.
const matchAssignees = (rawList) => {
  const team = (window.TEAM || TEAM_SEED);
  const matched = []; const unmatched = [];
  const split = rawList.flatMap(s => (s || '').split(/[,;]| e /i).map(x => x.trim()).filter(Boolean));
  split.forEach(raw => {
    const n = normStr(raw); if (!n) return;
    const firstTok = n.split(/\s+/)[0];
    const hit = team.find(p => {
      const pn = normStr(p.name); const pf = pn.split(/\s+/)[0];
      return pn === n || pn.includes(firstTok) || pf === firstTok || normStr(p.initials) === n.replace(/\s/g,'');
    });
    if (hit) { if (!matched.includes(hit.id)) matched.push(hit.id); }
    else if (!unmatched.includes(raw)) unmatched.push(raw);
  });
  return { matched, unmatched };
};

const matchProject = (subestacao) => {
  if (!subestacao) return { id: 'pdd', unmatched: null };
  const projects = (window.PROJECTS || PROJECTS_SEED);
  const n = normStr(subestacao);
  const hit = projects.find(p => normStr(p.label).includes(n) || n.includes(normStr(p.label)));
  return hit ? { id: hit.id, unmatched: null } : { id: 'pdd', unmatched: subestacao.trim() };
};

// Converte uma linha do CSV (objeto coluna→valor) numa tarefa do Planner.
const mapOSRowToTask = (row) => {
  const get = (...keys) => {
    for (const k of keys) {
      // busca case-insensitive e tolerante a espaços finais
      const key = Object.keys(row).find(rk => normStr(rk) === normStr(k));
      if (key && row[key] != null && row[key].toString().trim() !== '') return row[key].toString().trim();
    }
    return '';
  };

  const osId = get('ID');
  if (!osId) return null;

  const nome = get('NOME');
  const codserv = get('CODSERV');
  const titleBase = [nome, codserv].filter(Boolean).join(' · ');
  const title = titleBase || get('Title') || `OS ${osId}`;

  const desc = [get('DESC'), get('Obervação','Observação'), get('SERVIÇO'), get('ATIVIDADE')]
    .filter(Boolean).join('\n\n');

  const start = parseDate(get('DATA_OS','DATA OS','Created'));
  const due = parseDate(get('Prazo OS','PrazoOS'));
  const status = mapStatus(get('Status'), get('Status Fluxo de Aprovação'));
  const impact = mapImpact(get('Nível de Aprovação','Nivel de Aprovação'));
  const priority = derivePriority(due);

  const { matched: assignees, unmatched: unmatchedPeople } = matchAssignees([
    get('ENG_RESPONSAVEL','ENG RESPONSAVEL'),
    get('ENG ESTUDO'),
    get('RESPONSAVEL','Responsável'),
    get('OS - Responsável'),
  ]);

  const subestacao = get('Subestação','Subestacao');
  const { id: projectId, unmatched: unmatchedProj } = matchProject(subestacao);

  const tags = [
    get('LOCALIDADE'), get('REGIONAL'),
    get('Alimentador'), get('Rural Urbano'),
    ...unmatchedPeople.map(n => `resp:${n}`),
    unmatchedProj ? `se:${unmatchedProj}` : null,
  ].filter(Boolean);

  const today = new Date().toISOString().slice(0,10);
  const inWeek = new Date(); inWeek.setDate(inWeek.getDate()+7);

  return {
    id: `OS-${osId}`,
    title, desc,
    status, priority, impact,
    fundamentacao: get('Parecer ASPO'),
    assignees: assignees.length ? assignees : ['me'],
    project: projectId,
    start: start || today,
    due: due || inWeek.toISOString().slice(0,10),
    progress: progressFromStatus(status),
    tags,
    recurrent: null,
    subtasks: [],
    comments: [],
  };
};

const importOSCSVFile = () => new Promise((resolve, reject) => {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'text/csv,.csv';
  input.onchange = () => {
    const file = input.files[0];
    if (!file) return reject('Nenhum arquivo');
    const r = new FileReader();
    r.onload = () => {
      try {
        const rows = parseCSV(r.result);
        if (rows.length < 2) return reject('CSV vazio ou sem cabeçalho');
        const header = rows[0].map(h => h.trim());
        const tasks = [];
        const warnPeople = new Set();
        const warnProj = new Set();
        for (let i = 1; i < rows.length; i++) {
          const cells = rows[i]; if (!cells.length || cells.every(c => !c || !c.trim())) continue;
          const obj = {};
          header.forEach((h, idx) => { obj[h] = cells[idx] ?? ''; });
          const t = mapOSRowToTask(obj);
          if (!t) continue;
          t.tags.forEach(tag => {
            if (tag.startsWith('resp:')) warnPeople.add(tag.slice(5));
            if (tag.startsWith('se:')) warnProj.add(tag.slice(3));
          });
          tasks.push(t);
        }
        resolve({ tasks, warnings: {
          people: Array.from(warnPeople),
          projects: Array.from(warnProj),
        }});
      } catch(e) { reject(e.message || String(e)); }
    };
    r.readAsText(file, 'utf-8');
  };
  input.click();
});

const SyncPanel = ({ tasks, onImport, onAppend, onClose }) => {
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
  const doImportOSCSV = async () => {
    try {
      const { tasks: imported, warnings } = await importOSCSVFile();
      if (!imported.length) { setStatus('✗ Nenhuma linha válida encontrada'); return; }
      const existing = new Set(tasks.map(t => t.id));
      const novas = imported.filter(t => !existing.has(t.id)).length;
      const atualizadas = imported.length - novas;
      const warnLines = [];
      if (warnings.people.length) warnLines.push(`  • ${warnings.people.length} responsável(is) não reconhecido(s) — viraram tags \`resp:...\`: ${warnings.people.slice(0,5).join(', ')}${warnings.people.length>5?'…':''}`);
      if (warnings.projects.length) warnLines.push(`  • ${warnings.projects.length} subestação(ões) sem projeto correspondente — viraram tags \`se:...\`: ${warnings.projects.slice(0,5).join(', ')}${warnings.projects.length>5?'…':''}`);
      const msg = [
        `Importar OS da lista SharePoint?`,
        ``,
        `  • ${novas} nova(s)`,
        `  • ${atualizadas} atualizada(s) (mesmo ID)`,
        ...warnLines,
        ``,
        `As demais tarefas do Planner serão preservadas.`,
      ].join('\n');
      if (!confirm(msg)) return;
      onAppend(imported);
      const parts = [`✓ ${novas} nova(s), ${atualizadas} atualizada(s)`];
      if (warnings.people.length) parts.push(`${warnings.people.length} resp. não mapeado(s)`);
      if (warnings.projects.length) parts.push(`${warnings.projects.length} SE não mapeada(s)`);
      setStatus(parts.join(' · '));
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

          {/* SharePoint "Gestão de OS" — importação por CSV */}
          <div style={{border:'1px solid var(--line)', borderRadius:10, padding:'14px 16px', marginBottom:14, background:'var(--surface)'}}>
            <div style={{fontWeight:600, fontSize:14, marginBottom:3, display:'flex', alignItems:'center', gap:8}}>
              Importar da lista SharePoint (Gestão de OS)
              <span style={{fontSize:10, padding:'2px 6px', borderRadius:4, background:'var(--bg-2)', color:'var(--ink-3)'}}>CSV</span>
            </div>
            <div style={{fontSize:12.5, color:'var(--ink-3)', marginBottom:10, lineHeight:1.5}}>
              Na lista do SharePoint, use <strong>Exportar → CSV</strong> (ou Excel → Salvar como CSV UTF-8) e carregue o arquivo aqui.
              Cada linha vira uma tarefa com ID <code style={{fontFamily:'var(--mono)', background:'var(--bg-2)', padding:'1px 5px', borderRadius:3}}>OS-&lt;id&gt;</code>.
              Reimportar atualiza tarefas existentes pelo mesmo ID (upsert) e preserva as demais.
            </div>
            <div style={{display:'flex', gap:8, marginBottom:8}}>
              <button className="btn btn-primary" onClick={doImportOSCSV} disabled={!onAppend}>
                Importar CSV da Gestão de OS…
              </button>
            </div>
            <div style={{padding:'8px 12px', background:'var(--bg-2)', border:'1px dashed var(--line)', borderRadius:6, fontSize:11.5, color:'var(--ink-3)', lineHeight:1.6}}>
              <strong style={{color:'var(--ink-2)'}}>Mapeamento:</strong> Status → coluna <em>Status</em>; Responsáveis → <em>ENG_RESPONSAVEL</em> + <em>ENG ESTUDO</em> (match por nome na equipe); Projeto → <em>Subestação</em>; Prazo → <em>Prazo OS</em>; Início → <em>DATA_OS</em>; Impacto → <em>Nível de Aprovação</em> (N1/N2/N3-N4).
              Responsáveis/subestações não reconhecidos viram tags <code style={{fontFamily:'var(--mono)'}}>resp:…</code> / <code style={{fontFamily:'var(--mono)'}}>se:…</code>.
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

Object.assign(window, { SyncPanel, useAutoFileSync, exportJSON, importJSONFile, importOSCSVFile, FS_SUPPORTED });
