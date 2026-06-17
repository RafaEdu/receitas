#!/bin/bash

echo "=== Verificando a versão do Docker Compose instalada na VM ==="
if sudo docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="sudo docker compose"
elif sudo docker-compose version >/dev/null 2>&1; then
    COMPOSE_CMD="sudo docker-compose"
else
    echo "Erro crítico: Docker Compose não foi detectado nesta VM."
    exit 1
fi

echo "Comando detectado e selecionado: $COMPOSE_CMD"
echo "=== Limpando resquícios antigos ==="
rm -rf receitas-projeto

echo "=== Clonando o repositório do GitHub ==="
# Substitua a URL abaixo pela URL real do seu repositório privado ou público
git clone https://github.com/RafaEdu/receitas.git receitas-projeto

cd receitas-projeto

echo "=== Subindo a Infraestrutura Base (Bancos e Jenkins) ==="
$COMPOSE_CMD up -d jenkins db-integration db-homolog db-prod

echo "=========================================================="
echo " Sucesso! Acesse o seu Jenkins em: http://177.44.248.43:8080"
echo " Usuário: admin"
echo " Senha: univates123"
echo "=========================================================="