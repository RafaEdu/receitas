const ENV_KEYS = [
  "PORT",
  "SESSION_SECRET",
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
  "RECEITAS_NOTIFICATION_TO",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM",
];

const path = require("path");
const dotenv = require("dotenv");

function readEmailEnvFromFiles() {
  const projectRoot = path.join(__dirname, "..", "..");

  dotenv.config({
    path: path.join(projectRoot, ".env"),
  });

  dotenv.config({
    path: path.join(projectRoot, ".env.local"),
    override: true,
  });

  return {
    RECEITAS_NOTIFICATION_TO: process.env.RECEITAS_NOTIFICATION_TO,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    SMTP_FROM: process.env.SMTP_FROM,
  };
}

function setControlledEnv(overrides = {}) {
  const emailEnv = readEmailEnvFromFiles();

  for (const key of ENV_KEYS) {
    delete process.env[key];
  }

  const baseEnv = {
    PORT: "3210",
    SESSION_SECRET: "test-secret",
    DB_HOST: "localhost",
    DB_PORT: "5432",
    DB_NAME: "receitas",
    DB_USER: "postgres",
    DB_PASSWORD: "postgres",
    ...emailEnv,
  };

  const env = {
    ...baseEnv,
    ...overrides,
  };

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined || value === null) {
      delete process.env[key];
      continue;
    }

    process.env[key] = String(value);
  }

  return env;
}

function loadServer(options = {}) {
  jest.resetModules();

  const testEnv = setControlledEnv(options.env || {});

  let poolMock;
  const sendMailMock = jest.fn().mockResolvedValue(undefined);
  const createTransportMock = jest
    .fn()
    .mockReturnValue({ sendMail: sendMailMock });

  jest.doMock("dotenv", () => ({
    config: jest.fn().mockReturnValue({ parsed: {} }),
  }));

  jest.doMock("pg", () => {
    poolMock = {
      query: jest.fn(),
      connect: jest.fn(),
    };

    return {
      Pool: jest.fn(() => poolMock),
    };
  });

  jest.doMock("nodemailer", () => ({
    createTransport: createTransportMock,
  }));

  const serverModule = require("../../server/server");

  return {
    ...serverModule,
    poolMock,
    sendMailMock,
    createTransportMock,
    testEnv,
  };
}

module.exports = {
  loadServer,
};
