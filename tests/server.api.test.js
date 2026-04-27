const request = require("supertest");
const { loadServer } = require("./helpers/loadServer");

function buildLoginQueryMock(poolMock, options = {}) {
  const {
    loginRows = [],
    healthError = null,
    receitasRows = [],
    dateColumn = "data_registro",
  } = options;

  poolMock.query.mockImplementation((query) => {
    const sql = String(query);

    if (sql.includes("FROM usuario")) {
      return Promise.resolve({ rows: loginRows });
    }

    if (sql.includes("SELECT 1")) {
      if (healthError) {
        return Promise.reject(healthError);
      }

      return Promise.resolve({ rows: [{ ok: 1 }] });
    }

    if (sql.includes("FROM information_schema.columns")) {
      return Promise.resolve({
        rows: dateColumn ? [{ column_name: dateColumn }] : [],
      });
    }

    if (sql.includes("FROM receita")) {
      return Promise.resolve({ rows: receitasRows });
    }

    return Promise.resolve({ rows: [], rowCount: 0 });
  });
}

describe("api routes", () => {
  test("GET /api/health sem login retorna 401", async () => {
    const server = loadServer();

    const response = await request(server.app).get("/api/health");

    expect(response.status).toBe(401);
    expect(response.body.message).toContain("nao autenticado");
  });

  test("POST /api/login sem credenciais retorna 400", async () => {
    const server = loadServer();

    const response = await request(server.app).post("/api/login").send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("Informe login e senha");
  });

  test("POST /api/login com credenciais invalidas retorna 401", async () => {
    const server = loadServer();
    buildLoginQueryMock(server.poolMock, { loginRows: [] });

    const response = await request(server.app)
      .post("/api/login")
      .send({ login: "admin", senha: "errada" });

    expect(response.status).toBe(401);
    expect(response.body.message).toContain("invalidos");
  });

  test("POST /api/login com usuario inativo retorna 403", async () => {
    const server = loadServer();
    buildLoginQueryMock(server.poolMock, {
      loginRows: [
        {
          id: 1,
          nome: "Admin",
          login: "admin",
          situacao: "I",
        },
      ],
    });

    const response = await request(server.app)
      .post("/api/login")
      .send({ login: "admin", senha: "1234" });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain("inativo");
  });

  test("login cria sessao e /api/health retorna 200", async () => {
    const server = loadServer();
    buildLoginQueryMock(server.poolMock, {
      loginRows: [
        {
          id: 1,
          nome: "Admin",
          login: "admin",
          situacao: "A",
        },
      ],
    });

    const agent = request.agent(server.app);

    const loginResponse = await agent
      .post("/api/login")
      .send({ login: "admin", senha: "1234" });
    const healthResponse = await agent.get("/api/health");

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.ok).toBe(true);
    expect(healthResponse.status).toBe(200);
    expect(healthResponse.body.ok).toBe(true);
  });

  test("/api/health retorna 500 quando banco falha", async () => {
    const server = loadServer();
    buildLoginQueryMock(server.poolMock, {
      loginRows: [
        {
          id: 1,
          nome: "Admin",
          login: "admin",
          situacao: "A",
        },
      ],
      healthError: new Error("db unavailable"),
    });

    const agent = request.agent(server.app);
    await agent.post("/api/login").send({ login: "admin", senha: "1234" });

    const response = await agent.get("/api/health");

    expect(response.status).toBe(500);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("Falha na conexao");
  });

  test("GET /api/receitas autenticado retorna lista", async () => {
    const server = loadServer();
    buildLoginQueryMock(server.poolMock, {
      loginRows: [
        {
          id: 1,
          nome: "Admin",
          login: "admin",
          situacao: "A",
        },
      ],
      receitasRows: [
        {
          id: 10,
          nome: "Bolo",
          descricao: "Chocolate",
          data_registro: "2026-04-27",
          custo: 12.5,
          tipo_receita: "D",
        },
      ],
    });

    const agent = request.agent(server.app);
    await agent.post("/api/login").send({ login: "admin", senha: "1234" });

    const response = await agent.get("/api/receitas");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].nome).toBe("Bolo");
  });
});
