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
$COMPOSE_CMD down --remove-orphans
rm -rf receitas-projeto

echo "=== Clonando o repositório do GitHub ==="
# !!! LEMBRE-SE DE ALTERAR PARA A URL REAL DO SEU REPOSITÓRIO ABAIXO !!!
git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git receitas-projeto

cd receitas-projeto

echo "=== Ajustando permissões do Socket do Docker para o Jenkins ==="
# Isso evita o erro de "Permissão Negada" quando o Jenkins tentar criar os containers de Node
sudo chmod 666 /var/run/docker.sock

echo "=== Subindo a Infraestrutura Base (Bancos e Jenkins com Plugins) ==="
# Adicionamos o --build para forçar o Jenkins a reconstruir instalando os novos plugins
$COMPOSE_CMD up -d --build jenkins db-integration db-homolog db-prod

echo "=========================================================="
echo " Sucesso! Aguarde 1 minuto para o Jenkins iniciar com os plugins."
echo " Acesse em: http://177.44.248.43:8080"
echo " Usuário: admin"
echo " Senha: univates123"
echo "=========================================================="