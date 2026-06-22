/**
 * server/migrate.js
 *
 * Runner de migrations simples para PostgreSQL.
 * Lê arquivos .sql da pasta /migrations em ordem numérica,
 * aplica apenas os que ainda não foram executados,
 * e registra cada um na tabela schema_migrations.
 *
 * Uso:
 *   node server/migrate.js              (aplica migrations pendentes)
 *   node server/migrate.js --status     (lista migrations e status)
 */

const path = require("path");
const fs = require("fs");
const { Pool } = require("pg");

require("dotenv").config();
require("dotenv").config({
  path: path.join(__dirname, "..", ".env.local"),
  override: true,
});

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");

// Garante que a tabela de controle existe antes de qualquer operação.
async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id        SERIAL PRIMARY KEY,
      filename  VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

// Retorna os nomes dos arquivos de migration já aplicados.
async function getAppliedMigrations(client) {
  const result = await client.query(
    "SELECT filename FROM schema_migrations ORDER BY filename"
  );
  return new Set(result.rows.map((row) => row.filename));
}

// Lê e ordena os arquivos .sql da pasta de migrations.
function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.warn(`Pasta de migrations não encontrada: ${MIGRATIONS_DIR}`);
    return [];
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

// Aplica todas as migrations pendentes em uma única transação por arquivo.
async function runMigrations() {
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);

    const applied = await getAppliedMigrations(client);
    const files = getMigrationFiles();
    const pending = files.filter((file) => !applied.has(file));

    if (pending.length === 0) {
      console.log("Nenhuma migration pendente. Banco já está atualizado.");
      return;
    }

    console.log(`Aplicando ${pending.length} migration(s)...`);

    for (const filename of pending) {
      const filepath = path.join(MIGRATIONS_DIR, filename);
      const sql = fs.readFileSync(filepath, "utf8");

      console.log(`  -> Aplicando: ${filename}`);

      // Cada migration roda em sua própria transação para isolar falhas.
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [filename]
        );
        await client.query("COMMIT");
        console.log(`     OK: ${filename}`);
      } catch (error) {
        await client.query("ROLLBACK");
        console.error(`     FALHOU: ${filename}`);
        console.error(`     Erro: ${error.message}`);
        throw error;
      }
    }

    console.log("Migrations concluídas com sucesso.");
  } finally {
    client.release();
    await pool.end();
  }
}

// Exibe o status atual de todas as migrations (aplicadas e pendentes).
async function showStatus() {
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);

    const applied = await getAppliedMigrations(client);
    const files = getMigrationFiles();

    if (files.length === 0) {
      console.log("Nenhum arquivo de migration encontrado.");
      return;
    }

    console.log("\nStatus das migrations:\n");
    console.log("  Status     Arquivo");
    console.log("  ---------  " + "-".repeat(40));

    for (const file of files) {
      const status = applied.has(file) ? "APLICADA " : "PENDENTE ";
      console.log(`  ${status}  ${file}`);
    }

    console.log();
  } finally {
    client.release();
    await pool.end();
  }
}

// Ponto de entrada: detecta o modo de execução pelo argumento.
const args = process.argv.slice(2);
const mode = args[0];

if (mode === "--status") {
  showStatus().catch((error) => {
    console.error("Erro ao verificar status:", error.message);
    process.exit(1);
  });
} else {
  runMigrations().catch((error) => {
    console.error("Erro ao aplicar migrations:", error.message);
    process.exit(1);
  });
}
