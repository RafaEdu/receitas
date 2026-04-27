const { loadServer } = require("./helpers/loadServer");

function captureError(fn) {
  try {
    fn();
    return null;
  } catch (error) {
    return error;
  }
}

describe("server utils", () => {
  test("normalizeOptionalText remove espacos extras", () => {
    const server = loadServer();

    const result = server.normalizeOptionalText(
      "  bolo de cenoura  ",
      "nome",
      100,
    );

    expect(result).toBe("bolo de cenoura");
  });

  test("normalizeOptionalText valida tamanho maximo", () => {
    const server = loadServer();

    const error = captureError(() =>
      server.normalizeOptionalText("x".repeat(101), "nome", 100),
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(400);
    expect(error.message).toContain("nome");
  });

  test("normalizeOptionalCost converte string numerica", () => {
    const server = loadServer();

    const result = server.normalizeOptionalCost("42.50");

    expect(result).toBe(42.5);
  });

  test("normalizeOptionalCost rejeita valor nao numerico", () => {
    const server = loadServer();

    const error = captureError(() => server.normalizeOptionalCost("abc"));

    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(400);
    expect(error.message).toContain("numerico");
  });

  test("normalizeOptionalDate aceita formato YYYY-MM-DD", () => {
    const server = loadServer();

    const result = server.normalizeOptionalDate("2026-04-27");

    expect(result).toBe("2026-04-27");
  });

  test("normalizeOptionalDate rejeita formato invalido", () => {
    const server = loadServer();

    const error = captureError(() =>
      server.normalizeOptionalDate("27/04/2026"),
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(400);
    expect(error.message).toContain("YYYY-MM-DD");
  });

  test("normalizeOptionalTipo converte para maiusculo", () => {
    const server = loadServer();

    const result = server.normalizeOptionalTipo("d");

    expect(result).toBe("D");
  });

  test("getDateColumnName retorna data_registro quando disponivel", async () => {
    const server = loadServer();
    const queryRunner = {
      query: jest.fn().mockResolvedValue({
        rows: [{ column_name: "data_registro" }],
      }),
    };

    const result = await server.getDateColumnName(queryRunner);

    expect(queryRunner.query).toHaveBeenCalledTimes(1);
    expect(result).toBe("data_registro");
  });

  test("getDateColumnName retorna null quando coluna nao existe", async () => {
    const server = loadServer();
    const queryRunner = {
      query: jest.fn().mockResolvedValue({
        rows: [{ column_name: "outra_coluna" }],
      }),
    };

    const result = await server.getDateColumnName(queryRunner);

    expect(result).toBeNull();
  });
});
