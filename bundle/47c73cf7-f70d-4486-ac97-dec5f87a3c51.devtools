// Seed data + constantes do domínio
// Contexto: planejamento de alta tensão em distribuidora de energia

// Status estáticos e precisos, conforme padrão do setor.
const STATUSES = [
  { id: 'todo',     label: 'Não Iniciado',          color: 'var(--s-todo)'     },
  { id: 'progress', label: 'Em Execução',           color: 'var(--s-progress)' },
  { id: 'review',   label: 'Pendente de Aprovação', color: 'var(--s-review)'   },
  { id: 'done',     label: 'Finalizado',            color: 'var(--s-done)'     },
  { id: 'cancel',   label: 'Cancelado',             color: 'var(--s-cancel)'   },
];

// Prioridade (urgência da execução).
const PRIORITIES = [
  { id: 'alta',  label: 'Alta'  },
  { id: 'media', label: 'Média' },
  { id: 'baixa', label: 'Baixa' },
];

// Impacto no negócio (efeito caso não seja entregue). Eixo independente da prioridade.
const IMPACTS = [
  { id: 'alto',  label: 'Alto'  },
  { id: 'medio', label: 'Médio' },
  { id: 'baixo', label: 'Baixo' },
];

// Matriz Risco = Impacto × Prioridade. Valor ∈ {baixo, médio, alto, crítico}.
const riskLevel = (impact, priority) => {
  const i = { alto: 3, medio: 2, baixo: 1 }[impact] || 2;
  const p = { alta: 3, media: 2, baixa: 1 }[priority] || 2;
  const s = i * p;
  if (s >= 9) return { id: 'critico', label: 'Crítico' };
  if (s >= 6) return { id: 'alto',    label: 'Alto'    };
  if (s >= 3) return { id: 'medio',   label: 'Médio'   };
  return           { id: 'baixo',   label: 'Baixo'   };
};

// Responsáveis com papéis fixos e ordem de escalonamento (1 → topo da matriz).
const TEAM_SEED = [
  { id: 'me', name: 'Você',            initials: 'VC', role: 'Planejamento AT',  escalation: 2 },
  { id: 'lz', name: 'Luiz',            initials: 'LZ', role: 'Planejamento',     escalation: 2 },
  { id: 'ml', name: 'Melanie',         initials: 'ML', role: 'Jurídico',         escalation: 2 },
  { id: 'it', name: 'Ítalo',           initials: 'IT', role: 'Aprovação e Gestão', escalation: 1 },
  { id: 'rs', name: 'Renata Siqueira', initials: 'RS', role: 'Engª de Proteção', escalation: 3 },
  { id: 'mc', name: 'Marcos Coelho',   initials: 'MC', role: 'Engº de Sistemas', escalation: 3 },
  { id: 'ab', name: 'Ana Beatriz',     initials: 'AB', role: 'Analista GIS',     escalation: 3 },
  { id: 'lf', name: 'Luís Fonseca',    initials: 'LF', role: 'Coord. Operação',  escalation: 2 },
];

// Macro (objetivos estratégicos anuais) → Micro (projetos → tarefas).
const OBJECTIVES_SEED = [
  { id: 'obj-conf',  label: 'Confiabilidade 2026 (DEC/FEC)',   horizon: 'anual' },
  { id: 'obj-exp',   label: 'Expansão do sistema 138 kV',      horizon: 'anual' },
  { id: 'obj-reg',   label: 'Conformidade regulatória ANEEL',  horizon: 'anual' },
  { id: 'obj-op',    label: 'Excelência operacional',          horizon: 'anual' },
];

const PROJECTS_SEED = [
  { id: 'sub-nrt', label: 'SE Norte 138 kV',           objective: 'obj-exp'  },
  { id: 'lt-lit',  label: 'LT Litoral',                objective: 'obj-conf' },
  { id: 'pdd',     label: 'PDD 2026',                  objective: 'obj-reg'  },
  { id: 'audit',   label: 'Auditoria ANEEL',           objective: 'obj-reg'  },
  { id: 'manut',   label: 'Manutenção programada',     objective: 'obj-op'   },
];

// Utilidade: data relativa a hoje
const today = new Date(); today.setHours(0,0,0,0);
const d = (offsetDays) => {
  const x = new Date(today);
  x.setDate(x.getDate() + offsetDays);
  return x.toISOString().slice(0, 10);
};

const SEED_TASKS = [
  {
    id: 'AT-2041', title: 'Estudo de fluxo de potência — SE Norte 138/13,8 kV',
    desc: 'Rodar cenários de carga pesada e leve para 2026 considerando nova entrada do Alimentador N-07. Validar limites térmicos dos transformadores T1/T2.',
    status: 'progress', priority: 'alta', impact: 'alto',
    fundamentacao: 'PR-DST-001 · Manual de Planejamento da Distribuição (ANEEL PRODIST Módulo 2)',
    assignees: ['me', 'mc'], project: 'sub-nrt',
    start: d(-4), due: d(3), progress: 55,
    tags: ['fluxo', 'sep'],
    recurrent: null,
    subtasks: [
      { id: 's1', text: 'Coletar curva de carga 2025 do SCADA', done: true },
      { id: 's2', text: 'Rodar cenário carga pesada (verão 18h)', done: true },
      { id: 's3', text: 'Rodar cenário carga leve (madrugada)', done: false },
      { id: 's4', text: 'Verificar limites térmicos T1/T2', done: false },
      { id: 's5', text: 'Consolidar relatório final', done: false },
    ],
    comments: [
      { who: 'mc', when: d(-2), text: 'Subi os resultados preliminares na pasta. T1 fica em 92% em pico.' },
      { who: 'me', when: d(-1), text: 'Precisamos revisar o ajuste do tap antes do relatório final.' },
    ]
  },
  {
    id: 'AT-2042', title: 'Ajuste de relés de proteção 50/51 — Alimentador N-07',
    desc: 'Coordenar proteção com o religador a jusante. Enviar parcial para CTEEP.',
    status: 'progress', priority: 'alta', impact: 'alto',
    fundamentacao: 'NBR 14039 · Procedimento de Rede ONS Submódulo 2.6',
    assignees: ['rs'], project: 'sub-nrt',
    start: d(-2), due: d(5), progress: 30,
    tags: ['proteção', 'coordenação'], recurrent: null,
    subtasks: [
      { id: 's1', text: 'Calcular curto no ponto de instalação', done: true },
      { id: 's2', text: 'Definir tempo-corrente 50/51', done: false },
      { id: 's3', text: 'Enviar parcial à CTEEP', done: false },
    ],
    comments: []
  },
  {
    id: 'AT-2043', title: 'Inspeção termográfica programada — LT Litoral',
    desc: 'Campanha trimestral em 42 km de linha de transmissão. Agendar com equipe de linha viva.',
    status: 'todo', priority: 'media', impact: 'medio',
    fundamentacao: 'NR-10 · Procedimento interno PR-MAN-007 (Inspeções Preditivas)',
    assignees: ['ab', 'lf'], project: 'manut',
    start: d(7), due: d(21), progress: 0,
    tags: ['inspeção', 'campo'],
    recurrent: 'quarterly',
    comments: []
  },
  {
    id: 'AT-2044', title: 'Revisão do memorial de cálculo da LT Litoral — vão 18-19',
    desc: 'Ajustar tensão mecânica conforme novo estudo de cabos CAA 336,4 MCM.',
    status: 'review', priority: 'media', impact: 'medio',
    fundamentacao: 'NBR 5422 · Projeto de linhas aéreas de transmissão',
    assignees: ['mc'], project: 'lt-lit',
    start: d(-8), due: d(-1), progress: 90,
    tags: ['memorial', 'mecânico'], recurrent: null,
    comments: [
      { who: 'mc', when: d(-1), text: 'Enviado para aprovação do gerente.' }
    ]
  },
  {
    id: 'AT-2045', title: 'Plano de desligamento — Troca de isoladores LT-04',
    desc: 'Janela de 6h no domingo. Articular com ONS e CCR.',
    status: 'todo', priority: 'alta', impact: 'alto',
    fundamentacao: 'Procedimento de Rede ONS Submódulo 6.1 (Programação da Operação)',
    assignees: ['me', 'lf'], project: 'manut',
    start: d(10), due: d(14), progress: 0,
    tags: ['desligamento', 'ons'], recurrent: null,
    comments: []
  },
  {
    id: 'AT-2046', title: 'Consolidação PDD 2026 — lote 02',
    desc: 'Consolidar empreendimentos de expansão (subestações e linhas de transmissão) do lote 02 para envio ao regulador.',
    status: 'progress', priority: 'media', impact: 'alto',
    fundamentacao: 'ANEEL REN 1000/2021 · PDD — Plano de Desenvolvimento da Distribuição',
    assignees: ['me'], project: 'pdd',
    start: d(-6), due: d(9), progress: 40,
    tags: ['pdd', 'regulatório'], recurrent: null,
    comments: []
  },
  {
    id: 'AT-2047', title: 'Resposta técnica — Ofício ANEEL 2187/2026',
    desc: 'Prazo regulatório para resposta sobre critério de planejamento N-1.',
    status: 'review', priority: 'alta', impact: 'alto',
    fundamentacao: 'ANEEL REN 956/2021 · Procedimento de Rede ONS Submódulo 2.3',
    assignees: ['me', 'rs'], project: 'audit',
    start: d(-3), due: d(1), progress: 85,
    tags: ['regulatório', 'n-1'], recurrent: null,
    subtasks: [
      { id: 's1', text: 'Levantar casos N-1 críticos 2025', done: true },
      { id: 's2', text: 'Redigir resposta técnica', done: true },
      { id: 's3', text: 'Revisão jurídica', done: false },
      { id: 's4', text: 'Protocolar no sistema ANEEL', done: false },
    ],
    comments: []
  },
  {
    id: 'AT-2048', title: 'Atualização cadastral GIS — Bay Norte 138 kV',
    desc: 'Cadastrar novo disjuntor e transformador de corrente no sistema geográfico.',
    status: 'todo', priority: 'baixa', impact: 'baixo',
    fundamentacao: 'PR-CAD-003 · Procedimento de Cadastro Técnico de Ativos',
    assignees: ['ab'], project: 'sub-nrt',
    start: d(5), due: d(12), progress: 0,
    tags: ['gis', 'cadastro'], recurrent: null,
    comments: []
  },
  {
    id: 'AT-2049', title: 'Relatório mensal de indicadores DEC/FEC',
    desc: 'Compilação dos indicadores de continuidade do mês para a diretoria.',
    status: 'todo', priority: 'media', impact: 'alto',
    fundamentacao: 'ANEEL PRODIST Módulo 8 · Qualidade da Energia Elétrica',
    assignees: ['me'], project: 'pdd',
    start: d(2), due: d(6), progress: 0,
    tags: ['indicadores'],
    recurrent: 'monthly',
    comments: []
  },
  {
    id: 'AT-2050', title: 'Modelagem PSS/E — Expansão subterrânea Centro',
    desc: 'Incluir novos circuitos subterrâneos no modelo SIN regional.',
    status: 'progress', priority: 'media', impact: 'medio',
    fundamentacao: 'Procedimento de Rede ONS Submódulo 18.2 · Modelos Elétricos',
    assignees: ['mc', 'me'], project: 'pdd',
    start: d(-1), due: d(15), progress: 20,
    tags: ['psse', 'modelagem'], recurrent: null,
    comments: []
  },
  {
    id: 'AT-2051', title: 'Dimensionamento de banco de capacitores 13,8 kV',
    desc: 'Avaliar necessidade de compensação reativa na SE Norte.',
    status: 'done', priority: 'media', impact: 'medio',
    fundamentacao: 'ANEEL PRODIST Módulo 8 · Níveis de tensão em regime permanente',
    assignees: ['rs'], project: 'sub-nrt',
    start: d(-18), due: d(-5), progress: 100,
    tags: ['reativo'], recurrent: null,
    comments: []
  },
  {
    id: 'AT-2052', title: 'Análise de curto-circuito pós-energização LT-04',
    desc: 'Recalcular níveis de curto após nova topologia da linha de transmissão.',
    status: 'done', priority: 'alta', impact: 'alto',
    fundamentacao: 'IEEE Std 551 · Estudo de curto-circuito em sistemas industriais',
    assignees: ['mc'], project: 'lt-lit',
    start: d(-22), due: d(-8), progress: 100,
    tags: ['curto'], recurrent: null,
    comments: []
  },
  {
    id: 'AT-2053', title: 'Revisão da diretriz interna DIR-PLJ-015',
    desc: 'Atualizar para nova versão da REN 1000.',
    status: 'cancel', priority: 'baixa', impact: 'baixo',
    fundamentacao: 'ANEEL REN 1000/2021 (em revisão)',
    assignees: ['me'], project: 'audit',
    start: d(-10), due: d(-2), progress: 10,
    tags: ['diretriz'], recurrent: null,
    comments: [{ who: 'me', when: d(-6), text: 'Suspensa aguardando nova REN.' }]
  },
  {
    id: 'AT-2054', title: 'Backup e arquivamento de estudos 2025',
    desc: 'Arquivar todos os estudos concluídos em 2025 no repositório.',
    status: 'todo', priority: 'baixa', impact: 'medio',
    fundamentacao: 'PR-DOC-002 · Guarda e preservação de documentos técnicos',
    assignees: ['ab'], project: 'audit',
    start: d(14), due: d(28), progress: 0,
    tags: ['arquivo'], recurrent: null,
    comments: []
  },
  {
    id: 'AT-2055', title: 'Reunião semanal de planejamento',
    desc: 'Alinhamento da semana com a equipe.',
    status: 'todo', priority: 'media', impact: 'baixo',
    fundamentacao: 'PR-GES-001 · Ritos de gestão do setor',
    assignees: ['me', 'rs', 'mc', 'ab', 'lf'], project: 'pdd',
    start: d(3), due: d(3), progress: 0,
    tags: ['reunião'],
    recurrent: 'weekly',
    comments: []
  },
];

Object.assign(window, { STATUSES, PRIORITIES, IMPACTS, riskLevel, TEAM_SEED, PROJECTS_SEED, OBJECTIVES_SEED, SEED_TASKS });
