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
echo "=== Limpando resquícios antigos (os dados dos bancos NÃO são apagados, pois usam volumes nomeados) ==="
$COMPOSE_CMD down --remove-orphans
rm -rf receitas-projeto

echo "=== Clonando o repositório do GitHub ==="
git clone https://github.com/RafaEdu/receitas.git receitas-projeto

cd receitas-projeto

echo "=== Ajustando permissões do Socket do Docker para o Jenkins ==="
# Isso evita o erro de "Permissão Negada" quando o Jenkins tentar criar os containers de Node
sudo chmod 666 /var/run/docker.sock

echo "=== Subindo a Infraestrutura Base (Bancos e Jenkins com Plugins) ==="
# Adicionamos o --build para forçar o Jenkins a reconstruir instalando os novos plugins
$COMPOSE_CMD up -d --build jenkins db-homolog db-prod

echo "=== Aguardando os bancos ficarem saudáveis ==="
sleep 5
$COMPOSE_CMD ps

echo "=========================================================="
echo " Sucesso! Aguarde 1 minuto para o Jenkins iniciar com os plugins."
echo " Acesse em: http://177.44.248.43:8080"
echo " Usuário: admin"
echo " Senha: univates123"
echo ""
echo " IMPORTANTE: o docker-compose.yml agora fixa 'name: receitas'."
echo " Os Jobs do Jenkins (que fazem checkout do mesmo repositório)"
echo " devem usar esse MESMO docker-compose.yml, garantindo que os"
echo " comandos 'docker compose' do pipeline atinjam este mesmo"
echo " projeto/stack, e não criem um stack duplicado."
echo "=========================================================="
