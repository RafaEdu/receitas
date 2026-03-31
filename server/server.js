const path = require("path");
const express = require("express");
const session = require("express-session");
const { Pool } = require("pg");

require("dotenv").config();

const app = express();
const port = Number(process.env.PORT) || 3000;
const clientDir = path.join(__dirname, "..", "client");
const sessionSecret = process.env.SESSION_SECRET || "receitas-dev-secret";

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

app.use(express.json());
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
app.use(express.static(clientDir));

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      message: "Usuario nao autenticado.",
    });
  }

  next();
}

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

app.post("/api/login", async (req, res) => {
  try {
    const { login, senha } = req.body || {};

    if (!login || !senha) {
      return res.status(400).json({
        message: "Informe login e senha.",
      });
    }

    const result = await pool.query(
      `
        SELECT id, nome, login, situacao
        FROM usuario
        WHERE login = $1 AND senha = $2
        LIMIT 1
      `,
      [login, senha],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Login ou senha invalidos.",
      });
    }

    const user = result.rows[0];

    if (user.situacao !== "A") {
      return res.status(403).json({
        message: "Usuario inativo.",
      });
    }

    req.session.user = {
      id: user.id,
      nome: user.nome,
      login: user.login,
    };

    return res.json({
      ok: true,
      user: req.session.user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao autenticar usuario.",
      error: error.message,
    });
  }
});

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

    res.clearCookie("receitas.sid");
    return res.json({ ok: true });
  });
});

app.get("/api/health", requireAuth, async (_req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      ok: true,
      message: "Conexao com o banco ativa.",
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Falha na conexao com o banco.",
      error: error.message,
    });
  }
});

app.get("/api/receitas", requireAuth, async (_req, res) => {
  try {
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
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      message: "Erro ao consultar receitas.",
      error: error.message,
    });
  }
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(clientDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
