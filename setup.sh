#!/bin/bash

echo "=== Iniciando recuperação do ambiente ==="

# 1. Limpa pastas antigas se existirem para evitar conflitos
rm -rf receitas-projeto

# 2. Clona o repositório onde estão todos os arquivos configurados acima
git clone https://github.com/RafaEdu/receitas.git receitas-projeto

# 3. Entra na pasta do projeto
cd receitas-projeto

# 4. Inicia a subida da infraestrutura básica (Jenkins e Bancos de Dados)
echo "=== Subindo Containers via Docker Compose ==="
sudo docker compose up -d jenkins db-integration db-homolog db-prod

echo "=========================================================="
echo " Tudo pronto! Acesse o Jenkins em: http://177.44.248.43:8080"
echo " Usuário: admin"
echo " Senha: univates123"
echo "=========================================================="