-- Migration 001: Schema inicial do projeto Receitas
-- Cria as tabelas de receita e usuario.

CREATE TABLE IF NOT EXISTS receita (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100),
    descricao VARCHAR(255),
    data_registro DATE,
    custo NUMERIC(10,2),
    tipo_receita CHAR(1)
);

CREATE TABLE IF NOT EXISTS usuario (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100),
    login VARCHAR(50),
    senha VARCHAR(50),
    situacao CHAR(1)
);
