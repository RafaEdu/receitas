const { loadServer } = require("./helpers/loadServer");

describe("email notification", () => {
  let warnSpy;
  let errorSpy;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test("retorna aviso quando SMTP esta incompleto", async () => {
    const server = loadServer({
      env: {
        SMTP_PASSWORD: "",
      },
    });

    const warning = await server.sendReceitaNotification({
      action: "create",
      receitaId: 1,
      payload: {
        nome: "Bolo",
      },
      user: {
        login: "admin",
      },
    });

    expect(warning).toBe(server.EMAIL_WARNING_MESSAGE);
    expect(warnSpy).toHaveBeenCalled();
  });

  test("envia email e retorna null quando envio funciona", async () => {
    const server = loadServer();

    const warning = await server.sendReceitaNotification({
      action: "create",
      receitaId: 12,
      payload: {
        nome: "Bolo",
        descricao: "Com cobertura",
        data_registro: "2026-04-27",
        custo: 20,
        tipo_receita: "D",
      },
      user: {
        login: "admin",
      },
    });

    expect(warning).toBeNull();
    expect(server.sendMailMock).toHaveBeenCalledTimes(1);

    const mail = server.sendMailMock.mock.calls[0][0];
    expect(mail.to).toBe(server.testEnv.RECEITAS_NOTIFICATION_TO);
    expect(mail.from).toBe(server.testEnv.SMTP_FROM);
    expect(mail.subject).toContain("CRIADA");
    expect(mail.text).toContain("Usuario: admin");
  });

  test("retorna aviso quando envio do email falha", async () => {
    const server = loadServer();
    server.sendMailMock.mockRejectedValueOnce(new Error("smtp offline"));

    const warning = await server.sendReceitaNotification({
      action: "update",
      receitaId: 15,
      payload: {
        nome: "Torta",
      },
      user: {
        login: "admin",
      },
    });

    expect(warning).toBe(server.EMAIL_WARNING_MESSAGE);
    expect(server.sendMailMock).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalled();
  });

  test("preenche campos vazios com texto padrao no corpo do email", async () => {
    const server = loadServer();

    await server.sendReceitaNotification({
      action: "create",
      receitaId: 99,
      payload: {
        nome: "",
        descricao: null,
        data_registro: undefined,
        custo: "",
        tipo_receita: "",
      },
      user: {
        login: "admin",
      },
    });

    const mail = server.sendMailMock.mock.calls[0][0];
    expect(mail.text).toContain("(vazio)");
  });
});
