const path = require("path");
const express = require("express");
const session = require("express-session");
const nodemailer = require("nodemailer");
const { Pool } = require("pg");

// Carrega variaveis de ambiente do arquivo .env para process.env.
require("dotenv").config();
// Carrega variaveis locais nao versionadas com prioridade sobre .env.
require("dotenv").config({
  path: path.join(__dirname, "..", ".env.local"),
  override: true,
});

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

const notificationRecipient =
  process.env.RECEITAS_NOTIFICATION_TO ||
  "rafael.dreissig@universo.univates.br";
const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT) || 587;
const smtpSecure =
  String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
const smtpUser = process.env.SMTP_USER;
const smtpPassword = String(process.env.SMTP_PASSWORD || "").replace(
  /\s+/g,
  "",
);
const smtpFrom = process.env.SMTP_FROM;

const missingEmailConfig = [
  ["RECEITAS_NOTIFICATION_TO", notificationRecipient],
  ["SMTP_HOST", smtpHost],
  ["SMTP_USER", smtpUser],
  ["SMTP_PASSWORD", smtpPassword],
  ["SMTP_FROM", smtpFrom],
].filter(([, value]) => !value);

if (missingEmailConfig.length > 0) {
  const missingVars = missingEmailConfig.map(([name]) => name).join(", ");
  console.warn(
    `Notificacao por e-mail indisponivel. Configure as variaveis: ${missingVars}.`,
  );
}

const emailTransporter =
  missingEmailConfig.length === 0
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      })
    : null;

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
async function getDateColumnName(queryRunner = pool) {
  const result = await queryRunner.query(
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

// Cria erro de validacao padrao para retornar status 400 no fluxo das rotas.
function createValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

const EMAIL_WARNING_MESSAGE =
  "Receita salva, mas o e-mail de notificacao nao foi enviado.";

// Normaliza campo de texto opcional, remove espacos e valida tamanho maximo.
function normalizeOptionalText(value, fieldName, maxLength) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalizedValue = String(value).trim();
  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue.length > maxLength) {
    throw createValidationError(
      `O campo ${fieldName} aceita no maximo ${maxLength} caracteres.`,
    );
  }

  return normalizedValue;
}

// Normaliza custo opcional e garante que seja um numero valido maior ou igual a zero.
function normalizeOptionalCost(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const normalizedCost = Number(value);
  if (Number.isNaN(normalizedCost)) {
    throw createValidationError("O campo custo deve ser numerico.");
  }

  if (normalizedCost < 0) {
    throw createValidationError("O campo custo nao pode ser negativo.");
  }

  return normalizedCost;
}

// Normaliza data opcional no formato YYYY-MM-DD para gravacao no banco.
function normalizeOptionalDate(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const normalizedDate = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    throw createValidationError(
      "O campo data deve estar no formato YYYY-MM-DD.",
    );
  }

  return normalizedDate;
}

// Normaliza tipo opcional para letra maiuscula com apenas 1 caractere.
function normalizeOptionalTipo(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const normalizedTipo = String(value).trim().toUpperCase();
  if (normalizedTipo.length !== 1) {
    throw createValidationError("O campo tipo_receita deve ter 1 caractere.");
  }

  return normalizedTipo;
}

// Converte valor para texto de e-mail com fallback padrao para campos vazios.
function formatNotificationField(value) {
  if (value === null || value === undefined || value === "") {
    return "(vazio)";
  }

  return String(value);
}

// Envia e-mail de auditoria ao criar/editar receita sem expor destinatario na API.
async function sendReceitaNotification({ action, receitaId, payload, user }) {
  if (!emailTransporter || !notificationRecipient) {
    return EMAIL_WARNING_MESSAGE;
  }

  const actionLabel = action === "create" ? "CRIADA" : "EDITADA";
  const actor = user?.login || user?.nome || "usuario-desconhecido";
  const subject = `[Receitas] Receita ${actionLabel}: #${receitaId}`;
  const text = [
    `Uma receita foi ${actionLabel.toLowerCase()} no sistema.`,
    "",
    `ID: ${receitaId}`,
    `Usuario: ${actor}`,
    `Nome: ${formatNotificationField(payload.nome)}`,
    `Descricao: ${formatNotificationField(payload.descricao)}`,
    `Data de registro: ${formatNotificationField(payload.data_registro)}`,
    `Custo: ${formatNotificationField(payload.custo)}`,
    `Tipo: ${formatNotificationField(payload.tipo_receita)}`,
    `Data/hora do evento: ${new Date().toISOString()}`,
  ].join("\n");

  try {
    await emailTransporter.sendMail({
      from: smtpFrom,
      to: notificationRecipient,
      subject,
      text,
    });
    return null;
  } catch (error) {
    // Log minimo para diagnostico sem risco de expor destinatario nas respostas.
    console.error("Falha no envio de notificacao por e-mail.", {
      name: error?.name,
      code: error?.code,
    });
    return EMAIL_WARNING_MESSAGE;
  }
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

// Cria uma nova receita (rota protegida por sessao).
app.post("/api/receitas", requireAuth, async (req, res) => {
  let dbClient;
  let transactionOpen = false;

  try {
    dbClient = await pool.connect();
    await dbClient.query("BEGIN");
    transactionOpen = true;

    // Normaliza os campos da nova receita antes de persistir no banco.
    const nome = normalizeOptionalText(req.body?.nome, "nome", 100);
    const descricao = normalizeOptionalText(
      req.body?.descricao,
      "descricao",
      255,
    );
    const dataRegistro = normalizeOptionalDate(req.body?.data_registro);
    const custo = normalizeOptionalCost(req.body?.custo);
    const tipoReceita = normalizeOptionalTipo(req.body?.tipo_receita);

    // Resolve nome da coluna de data dinamicamente para manter compatibilidade.
    const dateColumn = await getDateColumnName(dbClient);
    const columns = ["nome", "descricao", "custo", "tipo_receita"];
    const values = [nome, descricao, custo, tipoReceita];

    if (dateColumn) {
      // Insere a data na mesma posicao logica da listagem quando a coluna existir.
      columns.splice(2, 0, dateColumn);
      values.splice(2, 0, dataRegistro);
    }

    const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
    const query = `
      INSERT INTO receita (${columns.join(", ")})
      VALUES (${placeholders})
      RETURNING id
    `;

    const result = await dbClient.query(query, values);
    const receitaId = result.rows[0].id;

    await dbClient.query("COMMIT");
    transactionOpen = false;

    const warning = await sendReceitaNotification({
      action: "create",
      receitaId,
      payload: {
        nome,
        descricao,
        data_registro: dataRegistro,
        custo,
        tipo_receita: tipoReceita,
      },
      user: req.session?.user,
    });

    const responseBody = {
      ok: true,
      id: receitaId,
      message: "Receita criada com sucesso.",
    };

    if (warning) {
      responseBody.warning = warning;
    }

    return res.status(201).json({
      ...responseBody,
    });
  } catch (error) {
    if (dbClient && transactionOpen) {
      await dbClient.query("ROLLBACK").catch(() => {});
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Erro ao criar receita.",
    });
  } finally {
    if (dbClient) {
      dbClient.release();
    }
  }
});

// Atualiza uma receita (rota protegida por sessao).
app.put("/api/receitas/:id", requireAuth, async (req, res) => {
  let dbClient;
  let transactionOpen = false;

  try {
    dbClient = await pool.connect();
    await dbClient.query("BEGIN");
    transactionOpen = true;

    const receitaId = Number(req.params.id);
    if (!Number.isInteger(receitaId) || receitaId <= 0) {
      throw createValidationError("ID da receita invalido.");
    }

    // Normaliza todos os campos que podem ser alterados no modo de edicao.
    const nome = normalizeOptionalText(req.body?.nome, "nome", 100);
    const descricao = normalizeOptionalText(
      req.body?.descricao,
      "descricao",
      255,
    );
    const dataRegistro = normalizeOptionalDate(req.body?.data_registro);
    const custo = normalizeOptionalCost(req.body?.custo);
    const tipoReceita = normalizeOptionalTipo(req.body?.tipo_receita);

    // Resolve nome da coluna de data dinamicamente para manter compatibilidade.
    const dateColumn = await getDateColumnName(dbClient);
    const setParts = [];
    const values = [];

    setParts.push(`nome = $${values.push(nome)}`);
    setParts.push(`descricao = $${values.push(descricao)}`);

    if (dateColumn) {
      setParts.push(`${dateColumn} = $${values.push(dataRegistro)}`);
    }

    setParts.push(`custo = $${values.push(custo)}`);
    setParts.push(`tipo_receita = $${values.push(tipoReceita)}`);

    const idParam = `$${values.push(receitaId)}`;
    const query = `
      UPDATE receita
      SET ${setParts.join(", ")}
      WHERE id = ${idParam}
      RETURNING id
    `;

    const result = await dbClient.query(query, values);
    if (result.rowCount === 0) {
      await dbClient.query("ROLLBACK");
      transactionOpen = false;

      return res.status(404).json({
        message: "Receita nao encontrada.",
      });
    }

    await dbClient.query("COMMIT");
    transactionOpen = false;

    const warning = await sendReceitaNotification({
      action: "update",
      receitaId,
      payload: {
        nome,
        descricao,
        data_registro: dataRegistro,
        custo,
        tipo_receita: tipoReceita,
      },
      user: req.session?.user,
    });

    const responseBody = {
      ok: true,
      message: "Receita atualizada com sucesso.",
    };

    if (warning) {
      responseBody.warning = warning;
    }

    return res.json({
      ...responseBody,
    });
  } catch (error) {
    if (dbClient && transactionOpen) {
      await dbClient.query("ROLLBACK").catch(() => {});
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Erro ao atualizar receita.",
    });
  } finally {
    if (dbClient) {
      dbClient.release();
    }
  }
});

// Exclui uma receita (rota protegida por sessao).
app.delete("/api/receitas/:id", requireAuth, async (req, res) => {
  try {
    const receitaId = Number(req.params.id);
    if (!Number.isInteger(receitaId) || receitaId <= 0) {
      throw createValidationError("ID da receita invalido.");
    }

    const result = await pool.query(
      `
        DELETE FROM receita
        WHERE id = $1
        RETURNING id
      `,
      [receitaId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Receita nao encontrada.",
      });
    }

    return res.json({
      ok: true,
      message: "Receita excluida com sucesso.",
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Erro ao excluir receita.",
      error: error.message,
    });
  }
});

// Rota raiz: entrega a pagina principal da aplicacao.
app.get("/", (_req, res) => {
  res.sendFile(path.join(clientDir, "index.html"));
});

// Inicializa o servidor HTTP na porta configurada.
function startServer() {
  return app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  pool,
  EMAIL_WARNING_MESSAGE,
  requireAuth,
  getDateColumnName,
  normalizeOptionalText,
  normalizeOptionalCost,
  normalizeOptionalDate,
  normalizeOptionalTipo,
  formatNotificationField,
  sendReceitaNotification,
  startServer,
};
