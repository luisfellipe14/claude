# Planner AT · Fontes editáveis

Versão editável do `Planner-offline1.html`. Os módulos estão separados em arquivos individuais — edite qualquer `.js` ou `.css` e recarregue o browser.

## Como rodar

Por causa do `type="text/babel"` com `src=`, **é necessário um servidor HTTP local** (Chrome bloqueia XHR de `file://`).

### Opção 1 — Python (tem em qualquer Mac/Linux, Windows com Python instalado)
```bash
cd planner-src
python3 -m http.server 8000
```
Abra http://localhost:8000

### Opção 2 — Node
```bash
npx serve planner-src
```

### Opção 3 — VSCode
Instale a extensão **Live Server** → clique direito em `index.html` → "Open with Live Server".


## Publicar no GitHub Pages

Este repositório já possui workflow para publicar automaticamente a pasta `planner-src/` no GitHub Pages (`.github/workflows/deploy-pages.yml`).

### Passo a passo

1. Faça push para a branch padrão do repositório (`main` ou `master`).
2. No GitHub, vá em **Settings → Pages** e em **Build and deployment** selecione **Source: GitHub Actions**.
3. Aguarde o workflow de deploy finalizar (aba **Actions**).
4. A URL final normalmente fica:
   - `https://<seu-usuario>.github.io/<seu-repo>/`

> Observação: como o build publica `planner-src` como raiz do site, o `index.html` já abre direto no link acima.

## Estrutura

```
planner-src/
├── index.html              # Carrega tudo em ordem + registra o Service Worker
├── manifest.json           # Manifesto PWA (ícone SVG inline, instalável)
├── sw.js                   # Service Worker (cache-first offline)
├── src/
│   ├── style.css           # Todo o CSS
│   ├── 01-constants.js     # STATUSES, PRIORITIES, IMPACTS, riskLevel, TEAM_SEED, PROJECTS_SEED, OBJECTIVES_SEED, SEED_TASKS
│   ├── 02-icons.js         # Componente <Icon/> + <Avatar/> + <BrandMark/>
│   ├── 03-hooks.js         # useHistory, useHotkeys, ToastHost, HotkeysHelp
│   ├── 04-kanban.js        # KanbanView, KanbanCard (React.memo)
│   ├── 05-timeline.js      # TimelineView (Gantt com drag)
│   ├── 06-task-modal.js    # TaskModal (edição + validação + impacto/fundamentação)
│   ├── 07-notifications.js # NotifBell, ViewsMenu, IntegrationModal (.ics, webhook)
│   ├── 08-sync.js          # SyncPanel, useAutoFileSync, import/export JSON
│   ├── 09-settings.js      # SettingsPanel (equipe / projetos / objetivos estratégicos)
│   ├── 10-app.js           # App principal + render raiz + RiskHeatmap + deep-link
│   └── 11-audit.js         # appendAudit(...) + <AuditPanel/> (log de alterações)
├── vendor/
│   ├── react.development.js
│   ├── react-dom.development.js
│   └── babel.min.js         # Compila JSX em runtime
└── fonts/                   # Inter Tight + JetBrains Mono (woff2)
```

## Ordem de carregamento (importa!)

1. **React + ReactDOM + Babel** (vendor) — devem vir antes de tudo.
2. **01-constants.js** — expõe `STATUSES`, `IMPACTS`, `riskLevel`, `TEAM_SEED`, `OBJECTIVES_SEED` etc em `window` (script comum, sem JSX).
3. **02 a 09** — `text/babel` (compilados em runtime). Cada um adiciona seus componentes em `window.*` para o próximo módulo consumir.
4. **11-audit.js** — antes de `10-app.js`, para que `window.appendAudit` e `window.AuditPanel` já existam quando o App renderizar.
5. **10-app.js** — faz o `ReactDOM.createRoot(...).render(<App/>)`.
6. Bloco final de script registra o Service Worker (`sw.js`) com `navigator.serviceWorker.register`.

Se mudar a ordem ou renomear, ajuste em `index.html`.

## Estado / persistência

Todos os dados ficam em **localStorage** do navegador por padrão (chaves `planner_at_*`):

- `planner_at_v1` — tarefas
- `planner_at_team` / `planner_at_projects` / `planner_at_objectives` — cadastros
- `planner_at_audit` — log de auditoria (até 200 entradas)
- `planner_at_view`, `planner_at_theme`, `planner_at_heatmap_open` — preferências de UI

Para ter backup:
- **Import/Export JSON** (funciona em qualquer browser) — botão de Armazenamento no topo.
- **Auto-save em arquivo** (File System Access API, só Chrome/Edge) — aponte para um `.json` no OneDrive/Google Drive sincronizado.

## PWA / Offline

O `sw.js` implementa cache-first para assets estáticos e se registra automaticamente no load da página. Após a primeira visita, o app funciona offline.

- Nome do cache: `planner-at-v2` (incrementar se mudar a lista de assets).
- Manifest em `manifest.json` — permite "Instalar app" em Chrome/Edge/Safari.
- Para forçar atualização durante desenvolvimento: DevTools → Application → Service Workers → *Update on reload* ou *Unregister*.

## Log de auditoria

Todas as mutações de tarefa (criar, editar, excluir, mover entre colunas no Kanban, redimensionar no Timeline) são registradas automaticamente em `localStorage['planner_at_audit']` (cap de 200 entradas mais recentes).

Abra o painel pelo botão **"Log de auditoria"** no topo (ícone de lista à direita da barra de ações) — dá para filtrar por ID/título/ação e limpar o log.

## Dicas de edição

- **Ver cores / spacing** → `src/style.css` (variáveis CSS no topo: `--accent`, `--bg`, `--ink` etc).
- **Ver dados iniciais (seed)** → `src/01-constants.js`.
- **Trocar equipe / projetos / objetivos default** → `TEAM_SEED`, `PROJECTS_SEED`, `OBJECTIVES_SEED` em `01-constants.js`.
- **Adicionar novo status** → `STATUSES` em `01-constants.js` + cor `--s-novo` no CSS.
- **Mudar níveis de impacto ou matriz de risco** → `IMPACTS` + função `riskLevel(impact, priority)` em `01-constants.js`.
- **Adicionar calculadora de engenharia** → novo componente em `src/` e referenciar em `10-app.js`.

## Rebuildar para bundle offline (opcional)

A versão distribuída é um único `.html` com tudo embutido em base64 gzipado. O script que gerou isso não está no repositório — os arquivos editáveis aqui são o "source of truth" para desenvolvimento.

Para voltar a ter um arquivo único portátil, basta:
- Copiar o conteúdo de cada `.js` e `.css` direto no HTML (inline).
- Ou usar um bundler simples (esbuild / rollup / vite) com target ES6.

---

Gerado a partir de `Planner-offline1.html@bb446ed` (PR #2), mesclado com o módulo de auditoria + Service Worker + manifest PWA.
