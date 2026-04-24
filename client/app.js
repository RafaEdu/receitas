const loginSectionEl = document.getElementById("loginSection");
const appSectionEl = document.getElementById("appSection");
const loginFormEl = document.getElementById("loginForm");
const loginMessageEl = document.getElementById("loginMessage");
const statusEl = document.getElementById("status");
const bodyEl = document.getElementById("receitasBody");
const logoutBtnEl = document.getElementById("logoutBtn");
const addReceitaBtnEl = document.getElementById("addReceitaBtn");
const exportPdfBtnEl = document.getElementById("exportPdfBtn");
const toggleFiltersBtnEl = document.getElementById("toggleFiltersBtn");
const filtersRowEl = document.getElementById("filtersRow");
const filterIdInputEl = document.getElementById("filterIdInput");
const filterNomeInputEl = document.getElementById("filterNomeInput");
const filterDescricaoInputEl = document.getElementById("filterDescricaoInput");
const filterDataInputEl = document.getElementById("filterDataInput");
const filterCustoInputEl = document.getElementById("filterCustoInput");
const filterTipoSelectEl = document.getElementById("filterTipoSelect");
const applyFiltersBtnEl = document.getElementById("applyFiltersBtn");
const filterSummaryEl = document.getElementById("filterSummary");
const COST_FILTER_DEFAULT_DISPLAY = "00,00";

// Quantidade fixa de colunas da tabela (incluindo coluna de acoes).
const TABLE_COLUMN_COUNT = 7;
const DEFAULT_FILTERS = Object.freeze({
  id: "",
  nome: "",
  descricao: "",
  data_registro: "",
  custo: "",
  tipo_receita: "",
});

// Estado em memoria para renderizar tabela e controlar linha em edicao.
let receitasCache = [];
let editingReceitaId = null;
let addingNewReceita = false;
let filtersVisible = false;
let appliedFilters = { ...DEFAULT_FILTERS };
let filterCostDigits = "";

// Exibe a tela de login e oculta a area principal.
function showLogin(message = "") {
  loginSectionEl.classList.remove("hidden");
  appSectionEl.classList.add("hidden");
  loginMessageEl.textContent = message;
}

// Exibe a area principal e oculta a tela de login.
function showApp() {
  loginSectionEl.classList.add("hidden");
  appSectionEl.classList.remove("hidden");
  loginMessageEl.textContent = "";
}

// Escapa caracteres especiais para evitar injecao de HTML em conteudo dinamico.
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Formata data para valor compativel com input type="date" (YYYY-MM-DD).
function toDateInputValue(dateValue) {
  if (!dateValue) return "";

  const rawText = String(dateValue);
  const directMatch = rawText.match(/^(\d{4}-\d{2}-\d{2})/);
  if (directMatch) {
    return directMatch[1];
  }

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return "";

  const year = parsedDate.getUTCFullYear();
  const month = String(parsedDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Exibe mensagem de estado ocupando toda a largura da tabela.
function renderTableMessage(message) {
  bodyEl.innerHTML = `<tr><td colspan='${TABLE_COLUMN_COUNT}'>${escapeHtml(message)}</td></tr>`;
}

// Formata data para padrao brasileiro.
function formatDate(dateValue) {
  if (!dateValue) return "-";
  return new Date(dateValue).toLocaleDateString("pt-BR");
}

// Formata valor numerico como moeda BRL.
function formatMoney(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return "-";
  return number.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Normaliza texto para comparacao de filtros sem diferenciar maiusculas/minusculas.
function normalizeFilterText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

// Converte entrada de custo para centavos (somente digitos): 4000 => 40,00.
function normalizeCostFilterCents(value) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .trim();
}

// Formata texto de centavos para exibicao progressiva no input de custo.
function formatCostFilterDisplay(centsText) {
  const digits = normalizeCostFilterCents(centsText);
  if (!digits) {
    return COST_FILTER_DEFAULT_DISPLAY;
  }

  const padded = digits.padStart(3, "0");
  const integerPart = padded.slice(0, -2).replace(/^0+(?=\d)/, "");
  const decimalPart = padded.slice(-2);
  return `${integerPart},${decimalPart}`;
}

// Atualiza estado interno de custo em centavos e refleti o valor mascarado no input.
function setCostFilterDigits(rawValue) {
  filterCostDigits = normalizeCostFilterCents(rawValue);

  if (!filterCustoInputEl) {
    return;
  }

  filterCustoInputEl.value = formatCostFilterDisplay(filterCostDigits);
}

// Mantem o cursor no final do input para reforcar digitacao progressiva.
function moveCostInputCaretToEnd() {
  if (!filterCustoInputEl) {
    return;
  }

  const end = filterCustoInputEl.value.length;
  filterCustoInputEl.setSelectionRange(end, end);
}

// Converte custo da receita para centavos inteiros para comparar com o filtro.
function toCostInCents(value) {
  const number = Number(value);
  if (Number.isNaN(number)) {
    return null;
  }

  return Math.round(number * 100);
}

// Indica se ha pelo menos um filtro aplicado na tabela.
function hasActiveFilters() {
  return Object.values(appliedFilters).some((value) => value !== "");
}

// Le os valores da linha de filtros para aplicar somente quando o usuario clicar na lupa.
function readFilterValues() {
  return {
    id: normalizeFilterText(filterIdInputEl?.value),
    nome: normalizeFilterText(filterNomeInputEl?.value),
    descricao: normalizeFilterText(filterDescricaoInputEl?.value),
    data_registro: String(filterDataInputEl?.value || ""),
    custo: filterCostDigits,
    tipo_receita: String(filterTipoSelectEl?.value || "")
      .trim()
      .toUpperCase(),
  };
}

// Limpa os campos visuais da linha de filtros quando o painel e fechado.
function clearFilterInputs() {
  if (filterIdInputEl) filterIdInputEl.value = "";
  if (filterNomeInputEl) filterNomeInputEl.value = "";
  if (filterDescricaoInputEl) filterDescricaoInputEl.value = "";
  if (filterDataInputEl) filterDataInputEl.value = "";
  setCostFilterDigits("");
  if (filterTipoSelectEl) filterTipoSelectEl.value = "";
}

// Filtra a lista local de receitas com base no conjunto de filtros aplicados.
function filterReceitas(items) {
  if (!hasActiveFilters()) {
    return items;
  }

  return items.filter((item) => {
    const idText = String(item.id ?? "");
    const nomeText = normalizeFilterText(item.nome);
    const descricaoText = normalizeFilterText(item.descricao);
    const dataText = toDateInputValue(item.data_registro);
    const custoInCents = toCostInCents(item.custo);
    const tipoText = String(item.tipo_receita || "")
      .trim()
      .toUpperCase();

    if (appliedFilters.id && !idText.includes(appliedFilters.id)) {
      return false;
    }

    if (appliedFilters.nome && !nomeText.includes(appliedFilters.nome)) {
      return false;
    }

    if (
      appliedFilters.descricao &&
      !descricaoText.includes(appliedFilters.descricao)
    ) {
      return false;
    }

    if (
      appliedFilters.data_registro &&
      dataText !== appliedFilters.data_registro
    ) {
      return false;
    }

    if (appliedFilters.custo) {
      const filteredCents = Number(appliedFilters.custo);
      if (
        !Number.isInteger(filteredCents) ||
        filteredCents < 0 ||
        custoInCents !== filteredCents
      ) {
        return false;
      }
    }

    if (
      appliedFilters.tipo_receita &&
      tipoText !== appliedFilters.tipo_receita
    ) {
      return false;
    }

    return true;
  });
}

// Retorna a lista visivel na tabela considerando os filtros ja aplicados.
function getVisibleReceitas() {
  return filterReceitas(receitasCache);
}

// Monta descricao textual dos filtros ativos para incluir no cabecalho do PDF.
function getAppliedFiltersSummary() {
  if (!hasActiveFilters()) {
    return "Sem filtros";
  }

  const labels = [];

  if (appliedFilters.id) {
    labels.push(`ID contem \"${appliedFilters.id}\"`);
  }

  if (appliedFilters.nome) {
    labels.push(`Nome contem \"${appliedFilters.nome}\"`);
  }

  if (appliedFilters.descricao) {
    labels.push(`Descricao contem \"${appliedFilters.descricao}\"`);
  }

  if (appliedFilters.data_registro) {
    labels.push(`Data igual a ${appliedFilters.data_registro}`);
  }

  if (appliedFilters.custo) {
    const costNumber = Number(appliedFilters.custo) / 100;
    labels.push(`Custo igual a ${formatMoney(costNumber)}`);
  }

  if (appliedFilters.tipo_receita) {
    labels.push(`Tipo igual a ${appliedFilters.tipo_receita}`);
  }

  return labels.join(" | ");
}

// Exporta a tabela exibida para PDF com cabecalho e linhas filtradas.
function exportReceitasPdf() {
  const visibleReceitas = getVisibleReceitas();

  if (visibleReceitas.length === 0) {
    statusEl.textContent = "Nao ha receitas para exportar no momento.";
    return;
  }

  const jsPdfNamespace = window.jspdf;
  const JsPdfClass = jsPdfNamespace?.jsPDF;
  if (typeof JsPdfClass !== "function") {
    statusEl.textContent =
      "Biblioteca de PDF indisponivel. Recarregue a pagina e tente novamente.";
    return;
  }

  const doc = new JsPdfClass({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  if (typeof doc.autoTable !== "function") {
    statusEl.textContent =
      "Plugin de tabela para PDF indisponivel. Recarregue a pagina e tente novamente.";
    return;
  }

  const generatedAt = new Date().toLocaleString("pt-BR");
  const filtersSummary = getAppliedFiltersSummary();

  doc.setFontSize(16);
  doc.text("Relatorio de Receitas", 40, 40);

  doc.setFontSize(10);
  doc.text(`Gerado em: ${generatedAt}`, 40, 60);
  doc.text(`Filtros: ${filtersSummary}`, 40, 76, { maxWidth: 760 });

  const tableHead = [["ID", "Nome", "Descricao", "Data", "Custo", "Tipo"]];
  const tableBody = visibleReceitas.map((item) => [
    String(item.id ?? "-"),
    String(item.nome || "-"),
    String(item.descricao || "-"),
    formatDate(item.data_registro),
    formatMoney(item.custo),
    String(item.tipo_receita || "-"),
  ]);

  doc.autoTable({
    startY: 92,
    head: tableHead,
    body: tableBody,
    styles: {
      fontSize: 9,
      cellPadding: 5,
      textColor: [32, 33, 36],
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [32, 33, 36],
      lineColor: [229, 231, 235],
      lineWidth: 0.5,
      fontStyle: "bold",
    },
    bodyStyles: {
      lineColor: [237, 240, 243],
      lineWidth: 0.5,
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 130 },
      2: { cellWidth: 240 },
      3: { cellWidth: 85 },
      4: { cellWidth: 95 },
      5: { cellWidth: 60 },
    },
  });

  const timestamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const filterSuffix = hasActiveFilters() ? "_filtrado" : "_completo";
  doc.save(`relatorio_receitas${filterSuffix}_${timestamp}.pdf`);
  statusEl.textContent = "Relatorio PDF gerado com sucesso.";
}

// Exibe feedback do resultado de consulta de filtros.
function updateFilterSummary(foundCount, totalCount) {
  if (!filterSummaryEl) {
    return;
  }

  if (!hasActiveFilters()) {
    filterSummaryEl.textContent = "";
    filterSummaryEl.classList.add("hidden");
    return;
  }

  const label =
    foundCount === 1 ? "receita encontrada" : "receitas encontradas";
  filterSummaryEl.textContent = `${foundCount} ${label} (de ${totalCount} registros).`;
  filterSummaryEl.classList.remove("hidden");
}

// Aplica filtros sob demanda via botao de lupa ou tecla Enter.
function applyFilters() {
  editingReceitaId = null;
  addingNewReceita = false;
  appliedFilters = readFilterValues();
  renderReceitas();
  statusEl.textContent = hasActiveFilters()
    ? "Filtros aplicados com sucesso."
    : "Filtros limpos. Listagem completa exibida.";
}

// Exibe/oculta linha de filtros no cabecalho da tabela.
function toggleFilters() {
  if (!filtersRowEl || !toggleFiltersBtnEl) {
    return;
  }

  filtersVisible = !filtersVisible;
  filtersRowEl.classList.toggle("hidden", !filtersVisible);
  toggleFiltersBtnEl.setAttribute("aria-expanded", String(filtersVisible));

  if (!filtersVisible) {
    appliedFilters = { ...DEFAULT_FILTERS };
    clearFilterInputs();
    renderReceitas();
    statusEl.textContent = "Filtros ocultados. Listagem completa exibida.";
    return;
  }

  filterIdInputEl?.focus();
}

// Faz requisicao de login ao backend.
async function doLogin(login, senha) {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ login, senha }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Falha ao realizar login.");
  }
}

// Solicita encerramento da sessao no backend.
async function doLogout() {
  await fetch("/api/logout", {
    method: "POST",
  });
}

// Cria uma nova receita no backend com os dados informados no formulario inline.
async function createReceita(payload) {
  const response = await fetch("/api/receitas", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Erro ao criar receita.");
  }
}

// Atualiza uma receita especifica usando os dados editados da linha.
async function updateReceita(id, payload) {
  const response = await fetch(`/api/receitas/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Erro ao atualizar receita.");
  }
}

// Remove uma receita da base de dados.
async function deleteReceita(id) {
  const response = await fetch(`/api/receitas/${id}`, {
    method: "DELETE",
  });

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Erro ao excluir receita.");
  }
}

// Verifica autenticacao e conectividade com banco.
async function checkHealth() {
  const response = await fetch("/api/health");

  if (response.status === 401) {
    // Sinal padrao para o fluxo de redirecionar para login.
    throw new Error("UNAUTHORIZED");
  }

  if (!response.ok) {
    throw new Error("Nao foi possivel validar a conexao com o banco.");
  }

  const data = await response.json();
  statusEl.textContent = data.message || "Conexao com o banco ativa.";
}

// Busca receitas e preenche a tabela na tela.
async function loadReceitas() {
  const response = await fetch("/api/receitas");

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  if (!response.ok) {
    throw new Error("Erro ao buscar receitas.");
  }

  receitasCache = await response.json();
  if (!Array.isArray(receitasCache)) {
    receitasCache = [];
  }

  // Se a linha em edicao nao existe mais, sai automaticamente do modo de edicao.
  if (
    editingReceitaId !== null &&
    !receitasCache.some((item) => Number(item.id) === editingReceitaId)
  ) {
    editingReceitaId = null;
  }

  renderReceitas();
}

// Monta uma linha da tabela em modo somente leitura com botoes de acao.
function buildReadOnlyRow(item) {
  return `
    <tr data-id="${item.id}">
      <td>${item.id}</td>
      <td>${escapeHtml(item.nome || "-")}</td>
      <td>${escapeHtml(item.descricao || "-")}</td>
      <td>${formatDate(item.data_registro)}</td>
      <td>${formatMoney(item.custo)}</td>
      <td>${escapeHtml(item.tipo_receita || "-")}</td>
      <td class="actions-cell">
        <button type="button" class="btn-inline" data-action="edit" data-id="${item.id}">Editar</button>
        <button type="button" class="btn-inline btn-danger" data-action="delete" data-id="${item.id}">Excluir</button>
      </td>
    </tr>
  `;
}

// Monta uma linha editavel com campos para substituir valores da receita.
function buildEditableRow(item) {
  return `
    <tr data-id="${item.id}" class="editing-row">
      <td>${item.id}</td>
      <td><input class="inline-input" name="nome" type="text" maxlength="100" value="${escapeHtml(item.nome || "")}" /></td>
      <td><input class="inline-input" name="descricao" type="text" maxlength="255" value="${escapeHtml(item.descricao || "")}" /></td>
      <td><input class="inline-input" name="data_registro" type="date" value="${toDateInputValue(item.data_registro)}" /></td>
      <td><input class="inline-input" name="custo" type="number" step="0.01" min="0" value="${item.custo ?? ""}" /></td>
      <td><input class="inline-input" name="tipo_receita" type="text" maxlength="1" value="${escapeHtml(item.tipo_receita || "")}" /></td>
      <td class="actions-cell">
        <button type="button" class="btn-inline" data-action="save" data-id="${item.id}">Salvar</button>
        <button type="button" class="btn-inline btn-muted" data-action="cancel" data-id="${item.id}">Cancelar</button>
      </td>
    </tr>
  `;
}

// Monta a linha de insercao para criar uma nova receita no fim da tabela.
function buildNewReceitaRow() {
  return `
    <tr data-mode="new" class="editing-row">
      <td>Auto</td>
      <td><input class="inline-input" name="nome" type="text" maxlength="100" value="" /></td>
      <td><input class="inline-input" name="descricao" type="text" maxlength="255" value="" /></td>
      <td><input class="inline-input" name="data_registro" type="date" value="" /></td>
      <td><input class="inline-input" name="custo" type="number" step="0.01" min="0" value="" /></td>
      <td><input class="inline-input" name="tipo_receita" type="text" maxlength="1" value="" /></td>
      <td class="actions-cell">
        <button type="button" class="btn-inline" data-action="save-new">Salvar</button>
        <button type="button" class="btn-inline btn-muted" data-action="cancel-new">Cancelar</button>
      </td>
    </tr>
  `;
}

// Renderiza todas as linhas da tabela considerando o estado de edicao.
function renderReceitas() {
  const filteredReceitas = getVisibleReceitas();

  // Monta linhas de leitura/edicao conforme estado atual da interface.
  const rows = filteredReceitas.map((item) =>
    Number(item.id) === editingReceitaId
      ? buildEditableRow(item)
      : buildReadOnlyRow(item),
  );

  if (addingNewReceita) {
    rows.push(buildNewReceitaRow());
  }

  // Estado vazio: mantem feedback amigavel quando nao houver linhas para renderizar.
  if (rows.length === 0) {
    renderTableMessage(
      hasActiveFilters()
        ? "Nenhuma receita encontrada para os filtros informados."
        : "Nenhuma receita encontrada.",
    );
    updateFilterSummary(0, receitasCache.length);
    return;
  }

  // Renderiza linhas dinamicamente com dados recebidos da API e linha de criacao.
  bodyEl.innerHTML = rows.join("");
  updateFilterSummary(filteredReceitas.length, receitasCache.length);
}

// Coleta e valida os dados preenchidos na linha em modo de edicao.
function readRowEditionData(rowEl) {
  const nome = rowEl.querySelector("input[name='nome']").value.trim();
  const descricao = rowEl.querySelector("input[name='descricao']").value.trim();
  const dataRegistro = rowEl.querySelector("input[name='data_registro']").value;
  const custoText = rowEl.querySelector("input[name='custo']").value.trim();
  const tipoReceita = rowEl
    .querySelector("input[name='tipo_receita']")
    .value.trim()
    .toUpperCase();

  if (tipoReceita.length > 1) {
    throw new Error("O campo Tipo aceita apenas 1 caractere.");
  }

  let custo = null;
  if (custoText) {
    const normalizedCost = Number(custoText.replace(",", "."));
    if (Number.isNaN(normalizedCost)) {
      throw new Error("Informe um custo numerico valido.");
    }

    custo = normalizedCost;
  }

  return {
    nome: nome || null,
    descricao: descricao || null,
    data_registro: dataRegistro || null,
    custo,
    tipo_receita: tipoReceita || null,
  };
}

// Fluxo padrao de carregamento para endpoints protegidos.
async function loadProtectedData() {
  statusEl.textContent = "Conferindo conexao com o banco...";
  renderTableMessage("Carregando dados...");

  await checkHealth();
  await loadReceitas();
}

// Trata cliques nos botoes de acao da tabela (editar, salvar, cancelar e excluir).
bodyEl.addEventListener("click", async (event) => {
  const buttonEl = event.target.closest("button[data-action]");
  if (!buttonEl) {
    return;
  }

  const action = buttonEl.dataset.action;

  if (action === "cancel-new") {
    // Cancela a insercao de nova receita e remove a linha de criacao.
    addingNewReceita = false;
    renderReceitas();
    return;
  }

  if (action === "save-new") {
    try {
      // Le os dados da linha de criacao e envia para o backend inserir no banco.
      const rowEl = bodyEl.querySelector("tr[data-mode='new']");
      if (!rowEl) {
        throw new Error("Linha de criacao nao encontrada.");
      }

      const payload = readRowEditionData(rowEl);
      await createReceita(payload);
      addingNewReceita = false;
      await loadReceitas();
      statusEl.textContent = "Receita criada com sucesso.";
    } catch (error) {
      if (error.message === "UNAUTHORIZED") {
        showLogin("Faca login para acessar os dados.");
        return;
      }

      statusEl.textContent =
        error.message || "Nao foi possivel criar a nova receita.";
    }

    return;
  }

  const receitaId = Number(buttonEl.dataset.id);

  if (!Number.isInteger(receitaId) || receitaId <= 0) {
    statusEl.textContent =
      "Nao foi possivel identificar a receita selecionada.";
    return;
  }

  try {
    if (action === "edit") {
      // Ativa o modo de edicao apenas para a linha selecionada.
      addingNewReceita = false;
      editingReceitaId = receitaId;
      renderReceitas();
      return;
    }

    if (action === "cancel") {
      // Cancela alteracoes locais e retorna para o modo de leitura.
      editingReceitaId = null;
      renderReceitas();
      return;
    }

    if (action === "save") {
      // Le dados da linha editavel e persiste no backend.
      const rowEl = bodyEl.querySelector(`tr[data-id='${receitaId}']`);
      if (!rowEl) {
        throw new Error("Linha de edicao nao encontrada.");
      }

      const payload = readRowEditionData(rowEl);
      await updateReceita(receitaId, payload);
      editingReceitaId = null;
      addingNewReceita = false;
      await loadReceitas();
      statusEl.textContent = "Receita atualizada com sucesso.";
      return;
    }

    if (action === "delete") {
      // Confirmacao simples do navegador antes de excluir do banco.
      const shouldDelete = window.confirm(
        "Deseja realmente excluir esta receita?",
      );

      if (!shouldDelete) {
        return;
      }

      await deleteReceita(receitaId);

      if (editingReceitaId === receitaId) {
        editingReceitaId = null;
      }

      await loadReceitas();
      statusEl.textContent = "Receita excluida com sucesso.";
    }
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      showLogin("Faca login para acessar os dados.");
      return;
    }

    statusEl.textContent = error.message || "Nao foi possivel concluir a acao.";
  }
});

// Exibe no final da tabela a linha de criacao de nova receita.
addReceitaBtnEl.addEventListener("click", () => {
  // Mantem apenas um modo de edicao ativo por vez.
  editingReceitaId = null;
  addingNewReceita = true;
  renderReceitas();
});

// Exporta o relatorio da tabela com os filtros atualmente aplicados.
exportPdfBtnEl?.addEventListener("click", () => {
  exportReceitasPdf();
});

// Alterna exibicao da linha de filtros na tabela.
toggleFiltersBtnEl?.addEventListener("click", () => {
  toggleFilters();
});

// Mascara de custo em tempo real: 4000 => 40,00.
filterCustoInputEl?.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }

  if (/^\d$/.test(event.key)) {
    event.preventDefault();
    setCostFilterDigits(filterCostDigits + event.key);
    moveCostInputCaretToEnd();
    return;
  }

  if (event.key === "Backspace") {
    event.preventDefault();
    setCostFilterDigits(filterCostDigits.slice(0, -1));
    moveCostInputCaretToEnd();
    return;
  }

  if (event.key === "Delete") {
    event.preventDefault();
    setCostFilterDigits("");
    moveCostInputCaretToEnd();
    return;
  }

  const allowedKeys = [
    "Tab",
    "Enter",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
  ];

  if (!allowedKeys.includes(event.key)) {
    event.preventDefault();
  }
});

// Clique e foco mantem o cursor no fim para facilitar digitacao sequencial.
filterCustoInputEl?.addEventListener("focus", () => {
  moveCostInputCaretToEnd();
});

filterCustoInputEl?.addEventListener("click", (event) => {
  event.preventDefault();
  moveCostInputCaretToEnd();
});

// Permite colar numeros e aplica a mesma mascara automaticamente.
filterCustoInputEl?.addEventListener("paste", (event) => {
  event.preventDefault();
  const pastedText = event.clipboardData?.getData("text") || "";
  setCostFilterDigits(pastedText);
  moveCostInputCaretToEnd();
});

// Aplica os filtros ao clicar na lupa.
applyFiltersBtnEl?.addEventListener("click", () => {
  applyFilters();
});

// Atalho: Enter em qualquer campo de filtro dispara a consulta.
filtersRowEl?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  applyFilters();
});

// Trata envio do formulario de login.
loginFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginFormEl);
  const login = String(formData.get("login") || "").trim();
  const senha = String(formData.get("senha") || "").trim();

  if (!login || !senha) {
    loginMessageEl.textContent = "Informe login e senha.";
    return;
  }

  try {
    // Sucesso: autentica, mostra app e carrega dados protegidos.
    await doLogin(login, senha);
    showApp();
    await loadProtectedData();
    loginFormEl.reset();
  } catch (error) {
    // Falha: exibe mensagem devolvida pelo backend.
    showLogin(error.message || "Falha ao realizar login.");
  }
});

// Botao sair: encerra sessao e volta para tela de login.
logoutBtnEl.addEventListener("click", async () => {
  await doLogout();
  showLogin("Sessao encerrada.");
});

// Inicializacao da pagina.
// Tenta carregar dados diretamente para suportar sessao ja ativa.
async function init() {
  try {
    showApp();
    await loadProtectedData();
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      // Sem sessao ativa: usuario precisa autenticar.
      showLogin("Faca login para acessar os dados.");
      return;
    }

    // Erro geral (ex.: banco indisponivel) com feedback visual.
    showApp();
    statusEl.textContent = "Falha na conexao com o banco.";
    renderTableMessage("Nao foi possivel carregar as receitas.");
  }
}

// Dispara o fluxo inicial ao abrir a pagina.
setCostFilterDigits("");
init();
