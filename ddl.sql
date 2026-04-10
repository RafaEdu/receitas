-- Tabela de receitas exibidas na aplicacao.
CREATE TABLE receita (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100),
    descricao VARCHAR(255),
    data_registro DATE,
    custo NUMERIC(10,2),
    tipo_receita CHAR(1)
);

-- Tabela de usuarios usada para autenticacao.
CREATE TABLE usuario (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100),
    login VARCHAR(50),
    senha VARCHAR(50),
    situacao CHAR(1)
);