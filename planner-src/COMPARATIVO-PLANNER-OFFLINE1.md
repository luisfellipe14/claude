# Comparativo técnico — `Planner-offline1.html` vs `planner-src/`

## Resultado geral

O `Planner-offline1.html` é, de fato, um bundle dos arquivos de `planner-src/`, porém contém **implementações adicionais** (ou versões mais novas) em 5 módulos:

1. `src/01-constants.js`
2. `src/04-kanban.js`
3. `src/06-task-modal.js`
4. `src/09-settings.js`
5. `src/10-app.js`

Os demais assets (React, ReactDOM, Babel, hooks, timeline, notifications, sync, fontes) batem com os arquivos da pasta.

---

## Implementações extras encontradas no bundle

### 1) `01-constants.js`
- **Mudança de rótulos de status** para nomenclatura mais formal (ex.: “Não Iniciado”, “Em Execução”, “Pendente de Aprovação”).
- **Novo eixo de impacto** (`IMPACTS` com alto/médio/baixo).
- **Nova função de risco** (`riskLevel`) calculando risco por matriz impacto × prioridade.
- **Time com `escalation`** (nível hierárquico de escalonamento por pessoa).
- **Novo cadastro de objetivos estratégicos** (`OBJECTIVES_SEED`).
- **Projetos vinculados a objetivos** (campo `objective` em `PROJECTS_SEED`).
- **Tarefas seed enriquecidas** com campos novos como:
  - `impact`
  - `fundamentacao`
  - textos técnicos revisados.

### 2) `04-kanban.js`
- **`KanbanCard` com `React.memo`** para reduzir re-renderizações desnecessárias.

### 3) `06-task-modal.js`
- **Validação de formulário** antes de salvar (título, datas válidas, ao menos um responsável).
- **Save com coerções automáticas**:
  - status `done` força progresso para 100%
  - progresso 100% pode ajustar status para `done`.
- **Feedback de erro via toast** ao falhar validação.
- **Novo campo “Fundamentação”** (norma/base técnica).
- **Novo bloco de “Impacto no negócio”** com cálculo e exibição de risco.
- **Exibição do objetivo estratégico** associado ao projeto da tarefa.
- **Visualização de cadeia de escalonamento** dos responsáveis.
- **Botão salvar desabilitado** quando há erro de validação.

### 4) `09-settings.js`
- Persistência adicional de **objetivos estratégicos** (`OBJECTIVES_KEY`).
- Estado global adicional `window.OBJECTIVES`.
- **CRUD de objetivos estratégicos** dentro do painel de configurações.
- **Projeto passa a ter vínculo com objetivo** (edição e criação).
- **Gestão de escalonamento** dos responsáveis (níveis 1/2/3) com edição no painel.
- Layout do settings ampliado (mais colunas/áreas para objetivos).

### 5) `10-app.js`
- `migrate()` passa a incluir campos padrão novos (`impact`, `fundamentacao`).
- **Geração robusta de ID** (`nextTaskId`) sem colisão.
- **Heatmap/Matriz de risco** interativa (impacto × prioridade), com persistência de expandido/colapsado.
- **Deep-link por URL** (`?task=AT-XXXX`) para abrir tarefa diretamente.
- **Sincronização do `openId` com URL** via `history.replaceState`.
- **Debounce no salvamento localStorage** (evita escrita a cada tecla).
- Filtro e busca passam a considerar:
  - `impact`
  - `risk`
  - `fundamentacao` no texto pesquisável.
- **Estatísticas ampliadas** (incluindo tarefas críticas).
- Nova estrutura derivada de **matriz de risco** para análise de ativos.
- Criação de tarefa nova considera IDs existentes (evita duplicidade).
- Exportação CSV expandida (campos adicionais ligados ao novo modelo).

---

## Conclusão

O `Planner-offline1.html` representa uma versão funcionalmente mais avançada do planner em relação aos fontes atuais de `planner-src/src`.

Em resumo, as implementações extras estão concentradas em:
- **Governança técnica** (fundamentação, impacto, risco)
- **Gestão estratégica** (objetivos macro e vínculo projeto→objetivo)
- **Operação** (escalonamento, validação mais rígida, deep-link, IDs sem colisão, debounce, matriz de risco)
