// Seed data + constantes do domínio
// Contexto: planejamento de alta tensão em distribuidora de energia

const STATUSES = [
  { id: 'todo',     label: 'A fazer',        color: 'var(--s-todo)'     },
  { id: 'progress', label: 'Em andamento',   color: 'var(--s-progress)' },
  { id: 'review',   label: 'Em aprovação',   color: 'var(--s-review)'   },
  { id: 'done',     label: 'Concluída',      color: 'var(--s-done)'     },
  { id: 'cancel',   label: 'Cancelada',      color: 'var(--s-cancel)'   },
];

const PRIORITIES = [
  { id: 'alta',  label: 'Alta'  },
  { id: 'media', label: 'Média' },
  { id: 'baixa', label: 'Baixa' },
];

const TEAM_SEED = [
  { id: 'me', name: 'Você',            initials: 'VC', role: 'Planejamento AT' },
  { id: 'rs', name: 'Renata Siqueira', initials: 'RS', role: 'Engª de Proteção' },
  { id: 'mc', name: 'Marcos Coelho',   initials: 'MC', role: 'Engº de Sistemas' },
  { id: 'ab', name: 'Ana Beatriz',     initials: 'AB', role: 'Analista GIS'     },
  { id: 'lf', name: 'Luís Fonseca',    initials: 'LF', role: 'Coord. Operação'  },
];

const PROJECTS_SEED = [
  { id: 'sub-nrt', label: 'SE Norte 138kV' },
  { id: 'lt-lit',  label: 'LT Litoral' },
  { id: 'pdd',     label: 'PDD 2026' },
  { id: 'audit',   label: 'Auditoria ANEEL' },
  { id: 'manut',   label: 'Manutenção programada' },
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
    id: 'AT-2041', title: 'Estudo de fluxo de potência — SE Norte 138/13,8kV',
    desc: 'Rodar cenários de carga pesada e leve para 2026 considerando nova entrada do Alimentador N-07. Validar limites térmicos dos trafos T1/T2.',
    status: 'progress', priority: 'alta',
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
    status: 'progress', priority: 'alta',
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
    desc: 'Campanha trimestral em 42km. Agendar com equipe de linha viva.',
    status: 'todo', priority: 'media',
    assignees: ['ab', 'lf'], project: 'manut',
    start: d(7), due: d(21), progress: 0,
    tags: ['inspeção', 'campo'],
    recurrent: 'quarterly',
    comments: []
  },
  {
    id: 'AT-2044', title: 'Revisão do memorial de cálculo da LT Litoral — vão 18-19',
    desc: 'Ajustar tensão mecânica conforme novo estudo de cabos CAA 336,4 MCM.',
    status: 'review', priority: 'media',
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
    status: 'todo', priority: 'alta',
    assignees: ['me', 'lf'], project: 'manut',
    start: d(10), due: d(14), progress: 0,
    tags: ['desligamento', 'ons'], recurrent: null,
    comments: []
  },
  {
    id: 'AT-2046', title: 'Consolidação PDD 2026 — lote 02',
    desc: 'Consolidar obras de expansão do lote 02 para envio ao regulador.',
    status: 'progress', priority: 'media',
    assignees: ['me'], project: 'pdd',
    start: d(-6), due: d(9), progress: 40,
    tags: ['pdd', 'regulatório'], recurrent: null,
    comments: []
  },
  {
    id: 'AT-2047', title: 'Resposta técnica — Ofício ANEEL 2187/2026',
    desc: 'Prazo regulatório para resposta sobre critério de planejamento N-1.',
    status: 'review', priority: 'alta',
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
    id: 'AT-2048', title: 'Atualização cadastral GIS — Bay Norte 138kV',
    desc: 'Cadastrar novo disjuntor e TC no sistema.',
    status: 'todo', priority: 'baixa',
    assignees: ['ab'], project: 'sub-nrt',
    start: d(5), due: d(12), progress: 0,
    tags: ['gis', 'cadastro'], recurrent: null,
    comments: []
  },
  {
    id: 'AT-2049', title: 'Relatório mensal de indicadores DEC/FEC',
    desc: 'Compilação dos indicadores do mês para diretoria.',
    status: 'todo', priority: 'media',
    assignees: ['me'], project: 'pdd',
    start: d(2), due: d(6), progress: 0,
    tags: ['indicadores'],
    recurrent: 'monthly',
    comments: []
  },
  {
    id: 'AT-2050', title: 'Modelagem PSS/E — Expansão subterrânea Centro',
    desc: 'Incluir novos circuitos subterrâneos no modelo SIN regional.',
    status: 'progress', priority: 'media',
    assignees: ['mc', 'me'], project: 'pdd',
    start: d(-1), due: d(15), progress: 20,
    tags: ['psse', 'modelagem'], recurrent: null,
    comments: []
  },
  {
    id: 'AT-2051', title: 'Dimensionamento de banco de capacitores 13,8kV',
    desc: 'Avaliar necessidade de compensação reativa na SE Norte.',
    status: 'done', priority: 'media',
    assignees: ['rs'], project: 'sub-nrt',
    start: d(-18), due: d(-5), progress: 100,
    tags: ['reativo'], recurrent: null,
    comments: []
  },
  {
    id: 'AT-2052', title: 'Análise de curto-circuito pós-obra LT-04',
    desc: 'Recalcular níveis de curto após nova topologia.',
    status: 'done', priority: 'alta',
    assignees: ['mc'], project: 'lt-lit',
    start: d(-22), due: d(-8), progress: 100,
    tags: ['curto'], recurrent: null,
    comments: []
  },
  {
    id: 'AT-2053', title: 'Revisão da diretriz interna DIR-PLJ-015',
    desc: 'Atualizar para nova versão da REN 1000.',
    status: 'cancel', priority: 'baixa',
    assignees: ['me'], project: 'audit',
    start: d(-10), due: d(-2), progress: 10,
    tags: ['diretriz'], recurrent: null,
    comments: [{ who: 'me', when: d(-6), text: 'Suspensa aguardando nova REN.' }]
  },
  {
    id: 'AT-2054', title: 'Backup e arquivamento de estudos 2025',
    desc: 'Arquivar todos os estudos concluídos em 2025 no repositório.',
    status: 'todo', priority: 'baixa',
    assignees: ['ab'], project: 'audit',
    start: d(14), due: d(28), progress: 0,
    tags: ['arquivo'], recurrent: null,
    comments: []
  },
  {
    id: 'AT-2055', title: 'Reunião semanal de planejamento',
    desc: 'Alinhamento da semana com a equipe.',
    status: 'todo', priority: 'media',
    assignees: ['me', 'rs', 'mc', 'ab', 'lf'], project: 'pdd',
    start: d(3), due: d(3), progress: 0,
    tags: ['reunião'],
    recurrent: 'weekly',
    comments: []
  },
];

Object.assign(window, { STATUSES, PRIORITIES, TEAM_SEED, PROJECTS_SEED, SEED_TASKS });
