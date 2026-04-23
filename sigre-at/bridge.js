// SIGRE-AT · Bridge entre gestão de ativos (SIGRE) e de tarefas (Planner AT)
// -------------------------------------------------------------------------
// Roda DEPOIS de ativos/data.js (define window.OBRAS) e ANTES do Planner
// carregar. Objetivo: expor OBRAS como "projects" do Planner, preservando
// os projetos estratégicos do seed original.

(function () {
  if (!window.OBRAS) {
    console.warn('[sigre-at/bridge] window.OBRAS não encontrado — ativos/data.js carregou?');
    return;
  }

  // Projetos estratégicos fixos (espelham o PROJECTS_SEED do Planner).
  // Mantidos aqui para o caso do Planner rodar dentro do iframe e precisar
  // fundi-los com as Obras.
  const STRATEGIC_PROJECTS = [
    { id: 'sub-nrt', label: 'SE Norte 138 kV',       objective: 'obj-exp'  },
    { id: 'lt-lit',  label: 'LT Litoral',            objective: 'obj-conf' },
    { id: 'pdd',     label: 'PDD 2026',              objective: 'obj-reg'  },
    { id: 'audit',   label: 'Auditoria ANEEL',       objective: 'obj-reg'  },
    { id: 'manut',   label: 'Manutenção programada', objective: 'obj-op'   },
  ];

  // Heurística rasa — mapeia Obra → objetivo estratégico.
  const objetivoDeObra = (obra) => {
    const t = (obra.titulo || '').toLowerCase();
    if (/pdd|aneel|regulat/i.test(t)) return 'obj-reg';
    if (/expans|nov[ao] |nova se|novo trafo|ampliação/i.test(t)) return 'obj-exp';
    if (/manuten|subst|inspe|troca|limpeza/i.test(t)) return 'obj-op';
    return 'obj-conf';
  };

  const obraStatusToLabel = {
    planejada:    'planejada',
    em_execucao:  'em execução',
    concluida:    'concluída',
    cancelada:    'cancelada',
  };

  const projectsFromObras = () => window.OBRAS.map((o) => ({
    id: o.id,
    label: o.titulo,
    objective: objetivoDeObra(o),
    fromObra: true,
    regional: o.regional,
    obraStatus: o.status,
    obraStatusLabel: obraStatusToLabel[o.status] || o.status,
  }));

  const combinedProjects = () => [...STRATEGIC_PROJECTS, ...projectsFromObras()];

  // Expõe helpers globais.
  window.SIGRE_BRIDGE = {
    STRATEGIC_PROJECTS,
    projectsFromObras,
    combinedProjects,
    findObra: (projectId) => (window.OBRAS || []).find((o) => o.id === projectId) || null,
    tasksForObra: (obraId) => {
      try {
        const raw = localStorage.getItem('planner_at_v1');
        if (!raw) return [];
        return JSON.parse(raw).filter((t) => t && t.project === obraId);
      } catch (e) {
        return [];
      }
    },
    // Grava a lista unificada em planner_at_projects para o Planner consumir
    // quando montar no iframe. Só sobrescreve se mudou.
    syncPlannerProjects: () => {
      const next = combinedProjects();
      try {
        const prev = localStorage.getItem('planner_at_projects');
        const nextStr = JSON.stringify(next);
        if (prev !== nextStr) {
          localStorage.setItem('planner_at_projects', nextStr);
        }
      } catch (e) {
        console.warn('[sigre-at/bridge] falha ao gravar planner_at_projects', e);
      }
    },
    // Deep-link para o Planner no iframe.
    taskDeepLink: (taskId) => `../planner-src/index.html?task=${encodeURIComponent(taskId)}`,
    // Recupera um subconjunto de tarefas por ids (para o command palette).
    allTasks: () => {
      try {
        const raw = localStorage.getItem('planner_at_v1');
        return raw ? JSON.parse(raw) : [];
      } catch (e) { return []; }
    },
  };

  window.SIGRE_BRIDGE.syncPlannerProjects();

  // Migração one-shot: copia chaves antigas do SIGER para o namespace nominal.
  try {
    if (localStorage.getItem('sigre:migrated_v1') !== '1') {
      ['route', 'sel'].forEach((k) => {
        const oldK = 'sigre:' + k;
        const newK = 'sigre_at:' + k;
        if (localStorage.getItem(oldK) && !localStorage.getItem(newK)) {
          localStorage.setItem(newK, localStorage.getItem(oldK));
        }
      });
      localStorage.setItem('sigre:migrated_v1', '1');
    }
  } catch (e) {}
})();
