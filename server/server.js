const path = require("path");
const express = require("express");
const session = require("express-session");
const { Pool } = require("pg");

// Carrega variaveis de ambiente do arquivo .env para process.env.
require("dotenv").config();

const app = express();
const port = Number(process.env.PORT) || 3000;
const clientDir = path.join(__dirname, "..", "client");
const sessionSecret = process.env.SESSION_SECRET || "receitas-dev-secret";

// Pool de conexoes com o PostgreSQL para reutilizar conexoes de forma eficiente.
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Habilita leitura de JSON no corpo das requisicoes.
app.use(express.json());

// Configura sessao baseada em cookie.
// A autenticacao desta aplicacao depende de req.session.user.
app.use(
  session({
    name: "receitas.sid",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8,
    },
  }),
);

// Publica os arquivos estaticos do frontend (index.html, app.js, style.css).
app.use(express.static(clientDir));

// Middleware de protecao: exige usuario autenticado na sessao.
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      message: "Usuario nao autenticado.",
    });
  }

  next();
}

// Detecta o nome correto da coluna de data na tabela receita.
// O projeto aceita tanto data_registro (correto) quanto data_regisrtro (typo).
async function getDateColumnName() {
  const result = await pool.query(
    `
			SELECT column_name
			FROM information_schema.columns
			WHERE table_schema = 'public'
			AND table_name = 'receita'
			AND column_name IN ('data_registro', 'data_regisrtro')
		`,
  );

  const allowedColumns = new Set(["data_registro", "data_regisrtro"]);
  const column = result.rows.find((row) => allowedColumns.has(row.column_name));

  return column ? column.column_name : null;
}

// Login: valida credenciais e cria sessao de usuario.
app.post("/api/login", async (req, res) => {
  try {
    const { login, senha } = req.body || {};

    // Garante que os campos obrigatorios foram enviados.
    if (!login || !senha) {
      return res.status(400).json({
        message: "Informe login e senha.",
      });
    }

    // Busca usuario com login e senha informados.
    const result = await pool.query(
      `
        SELECT id, nome, login, situacao
        FROM usuario
        WHERE login = $1 AND senha = $2
        LIMIT 1
      `,
      [login, senha],
    );

    // Credenciais invalidas.
    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Login ou senha invalidos.",
      });
    }

    const user = result.rows[0];

    // Impede acesso de usuario marcado como inativo.
    if (user.situacao !== "A") {
      return res.status(403).json({
        message: "Usuario inativo.",
      });
    }

    // Salva dados essenciais do usuario na sessao.
    req.session.user = {
      id: user.id,
      nome: user.nome,
      login: user.login,
    };

    // Retorna informacao de sucesso para o frontend.
    return res.json({
      ok: true,
      user: req.session.user,
    });
  } catch (error) {
    // Erro inesperado de banco/processamento.
    return res.status(500).json({
      message: "Erro ao autenticar usuario.",
      error: error.message,
    });
  }
});

// Logout: encerra a sessao atual e limpa o cookie.
app.post("/api/logout", (req, res) => {
  if (!req.session) {
    return res.json({ ok: true });
  }

  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({
        message: "Erro ao finalizar sessao.",
      });
    }

    // Remove cookie de sessao no navegador.
    res.clearCookie("receitas.sid");
    return res.json({ ok: true });
  });
});

// Health protegido: confirma se sessao esta ativa e banco responde.
app.get("/api/health", requireAuth, async (_req, res) => {
  try {
    // Query minima para validar conectividade com o banco.
    await pool.query("SELECT 1");

    res.json({
      ok: true,
      message: "Conexao com o banco ativa.",
    });
  } catch (error) {
    // Falha de conexao ou indisponibilidade do banco.
    res.status(500).json({
      ok: false,
      message: "Falha na conexao com o banco.",
      error: error.message,
    });
  }
});

// Lista receitas (rota protegida por sessao).
app.get("/api/receitas", requireAuth, async (_req, res) => {
  try {
    // Resolve coluna de data dinamicamente para manter compatibilidade.
    const dateColumn = await getDateColumnName();
    const dateSelection = dateColumn
      ? `${dateColumn} AS data_registro`
      : "NULL::date AS data_registro";

    const query = `
			SELECT
				id,
				nome,
				descricao,
				${dateSelection},
				custo,
				tipo_receita
			FROM receita
			ORDER BY id
		`;

    const result = await pool.query(query);
    // Retorna lista completa para o frontend renderizar a tabela.
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      message: "Erro ao consultar receitas.",
      error: error.message,
    });
  }
});

// Rota raiz: entrega a pagina principal da aplicacao.
app.get("/", (_req, res) => {
  res.sendFile(path.join(clientDir, "index.html"));
});

// Inicializa o servidor HTTP na porta configurada.
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
