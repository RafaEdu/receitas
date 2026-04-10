-- Usuario padrao para acesso inicial ao sistema.
INSERT INTO usuario (nome, login, senha, situacao) VALUES ('Admin', 'admin', '1234', 'A');

-- Dados de exemplo para popular a lista de receitas.
INSERT INTO receita (nome, descricao, data_registro, custo, tipo_receita) VALUES ('Bolo de cenoura', 'Como fazer um bolo de cenoura sem cenoura', '2026-01-25', 40.00, 'D');
INSERT INTO receita (nome, descricao, data_registro, custo, tipo_receita) VALUES ('Bolo de chocolate', 'Como fazer um bolo de chocolate', '2026-01-07', 50.00, 'D');
INSERT INTO receita (nome, descricao, data_registro, custo, tipo_receita) VALUES ('Pão de queijo', 'Pão de queijo caseiro crocante', '2026-02-10', 15.00, 'S');
INSERT INTO receita (nome, descricao, data_registro, custo, tipo_receita) VALUES ('Brigadeiro', 'Brigadeiro tradicional de chocolate', '2026-02-14', 12.00, 'D');
INSERT INTO receita (nome, descricao, data_registro, custo, tipo_receita) VALUES ('Frango à parmesana', 'Frango empanado com molho e queijo', '2026-02-20', 35.00, 'S');
INSERT INTO receita (nome, descricao, data_registro, custo, tipo_receita) VALUES ('Pavê', 'Pavê de chocolate com biscoito', '2026-03-01', 25.00, 'D');
INSERT INTO receita (nome, descricao, data_registro, custo, tipo_receita) VALUES ('Risoto de cogumelos', 'Risoto cremoso com cogumelos frescos', '2026-03-08', 45.00, 'S');
INSERT INTO receita (nome, descricao, data_registro, custo, tipo_receita) VALUES ('Torta de sorvete', 'Torta gelada com sorvete e chocolate', '2026-03-15', 30.00, 'D');
INSERT INTO receita (nome, descricao, data_registro, custo, tipo_receita) VALUES ('Moqueca de peixe', 'Moqueca tradicional com peixe fresco', '2026-03-22', 55.00, 'S');
INSERT INTO receita (nome, descricao, data_registro, custo, tipo_receita) VALUES ('Mousse de maracujá', 'Mousse leve e refrescante', '2026-03-31', 18.00, 'D');