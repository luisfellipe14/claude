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

## Estrutura

```
planner-src/
├── index.html              # Carrega tudo em ordem
├── src/
│   ├── style.css           # Todo o CSS
│   ├── 01-constants.js     # STATUSES, PRIORITIES, TEAM_SEED, PROJECTS_SEED, SEED_TASKS
│   ├── 02-icons.js         # Componente <Icon/> + <Avatar/> + <BrandMark/>
│   ├── 03-hooks.js         # useHistory, useHotkeys, ToastHost, HotkeysHelp
│   ├── 04-kanban.js        # KanbanView, KanbanCard
│   ├── 05-timeline.js      # TimelineView (Gantt com drag)
│   ├── 06-task-modal.js    # TaskModal (edição de tarefa)
│   ├── 07-notifications.js # NotifBell, ViewsMenu, IntegrationModal (.ics, webhook)
│   ├── 08-sync.js          # SyncPanel, useAutoFileSync, import/export JSON
│   ├── 09-settings.js      # SettingsPanel (equipe/projetos)
│   └── 10-app.js           # App principal + render raiz
├── vendor/
│   ├── react.development.js
│   ├── react-dom.development.js
│   └── babel.min.js         # Compila JSX em runtime
└── fonts/                   # Inter Tight + JetBrains Mono (woff2)
```

## Ordem de carregamento (importa!)

1. **React + ReactDOM + Babel** (vendor) — devem vir antes de tudo
2. **01-constants.js** — expõe `STATUSES`, `TEAM_SEED` etc em `window` (script comum, sem JSX)
3. **02 a 10** — `text/babel` (compilados em runtime). Cada um adiciona seus componentes em `window.*` para o próximo módulo consumir.
4. **10-app.js** — faz o `ReactDOM.createRoot(...).render(<App/>)`

Se mudar a ordem ou renomear, ajuste em `index.html`.

## Estado / persistência

Todos os dados ficam em **localStorage** do navegador por padrão (chaves `planner_at_*`).

Para ter backup:
- **Import/Export JSON** (funciona em qualquer browser) — botão de Armazenamento no topo
- **Auto-save em arquivo** (File System Access API, só Chrome/Edge) — aponte para um `.json` no OneDrive/Google Drive sincronizado

## Dicas de edição

- **Ver cores / spacing** → `src/style.css` (variáveis CSS no topo: `--accent`, `--bg`, `--ink` etc)
- **Ver dados iniciais (seed)** → `src/01-constants.js`
- **Trocar equipe / projetos default** → `TEAM_SEED` e `PROJECTS_SEED` em `01-constants.js`
- **Adicionar novo status** → `STATUSES` em `01-constants.js` + cor `--s-novo` no CSS
- **Adicionar calculadora de engenharia** → novo componente em `src/` e referenciar em `10-app.js`

## Rebuildar para bundle offline (opcional)

A versão distribuída é um único `.html` de 1.7 MB com tudo embutido em base64 gzipado. O script que gerou isso não está no repositório — os arquivos editáveis aqui são o "source of truth" para desenvolvimento.

Para voltar a ter um arquivo único portátil, basta:
- Copiar o conteúdo de cada `.js` e `.css` direto no HTML (inline)
- Ou usar um bundler simples (esbuild / rollup / vite) com target ES6

---

Gerado a partir de `Planner-offline1.html@bb446ed` (PR #2).
