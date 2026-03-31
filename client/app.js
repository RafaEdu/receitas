const loginSectionEl = document.getElementById("loginSection");
const appSectionEl = document.getElementById("appSection");
const loginFormEl = document.getElementById("loginForm");
const loginMessageEl = document.getElementById("loginMessage");
const statusEl = document.getElementById("status");
const bodyEl = document.getElementById("receitasBody");
const logoutBtnEl = document.getElementById("logoutBtn");

function showLogin(message = "") {
  loginSectionEl.classList.remove("hidden");
  appSectionEl.classList.add("hidden");
  loginMessageEl.textContent = message;
}

function showApp() {
  loginSectionEl.classList.add("hidden");
  appSectionEl.classList.remove("hidden");
  loginMessageEl.textContent = "";
}

function formatDate(dateValue) {
  if (!dateValue) return "-";
  return new Date(dateValue).toLocaleDateString("pt-BR");
}

function formatMoney(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return "-";
  return number.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

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

async function doLogout() {
  await fetch("/api/logout", {
    method: "POST",
  });
}

async function checkHealth() {
  const response = await fetch("/api/health");

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  if (!response.ok) {
    throw new Error("Nao foi possivel validar a conexao com o banco.");
  }

  const data = await response.json();
  statusEl.textContent = data.message || "Conexao com o banco ativa.";
}

async function loadReceitas() {
  const response = await fetch("/api/receitas");

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  if (!response.ok) {
    throw new Error("Erro ao buscar receitas.");
  }

  const receitas = await response.json();

  if (!Array.isArray(receitas) || receitas.length === 0) {
    bodyEl.innerHTML =
      "<tr><td colspan='6'>Nenhuma receita encontrada.</td></tr>";
    return;
  }

  bodyEl.innerHTML = receitas
    .map(
      (item) => `
      <tr>
        <td>${item.id}</td>
        <td>${item.nome || "-"}</td>
        <td>${item.descricao || "-"}</td>
        <td>${formatDate(item.data_registro)}</td>
        <td>${formatMoney(item.custo)}</td>
        <td>${item.tipo_receita || "-"}</td>
      </tr>
    `,
    )
    .join("");
}

async function loadProtectedData() {
  statusEl.textContent = "Conferindo conexao com o banco...";
  bodyEl.innerHTML = "<tr><td colspan='6'>Carregando dados...</td></tr>";

  await checkHealth();
  await loadReceitas();
}

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
    await doLogin(login, senha);
    showApp();
    await loadProtectedData();
    loginFormEl.reset();
  } catch (error) {
    showLogin(error.message || "Falha ao realizar login.");
  }
});

logoutBtnEl.addEventListener("click", async () => {
  await doLogout();
  showLogin("Sessao encerrada.");
});

async function init() {
  try {
    showApp();
    await loadProtectedData();
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      showLogin("Faca login para acessar os dados.");
      return;
    }

    showApp();
    statusEl.textContent = "Falha na conexao com o banco.";
    bodyEl.innerHTML =
      "<tr><td colspan='6'>Nao foi possivel carregar as receitas.</td></tr>";
  }
}

init();
