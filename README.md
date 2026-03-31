# Projeto Receitas

Aplicacao web simples com:

- Tela de login
- API Node.js + Express
- Banco PostgreSQL
- Listagem da tabela `receita` para usuarios autenticados

## 1. Requisitos

- Node.js LTS (recomendado: 20.x)
- npm (vem com Node.js)
- Git
- PostgreSQL (recomendado: 16.x)
- psql (CLI do PostgreSQL)

## 2. Instalacao no Linux/Ubuntu

### 2.1 Linux (Ubuntu/Debian)

Node.js LTS:

```bash
sudo apt update
sudo apt install -y nodejs npm
```

PostgreSQL:

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
```

Validar:

```bash
node -v
npm -v
psql --version
```

Liberar porta Node:

```bash
ufw allow 3000
```

## 3. Baixar o projeto e instalar dependencias

No diretorio raiz do projeto:

```bash
npm install
```

## 4. Subir projeto em uma VM (passo a passo)

### 4.1 Acessar a VM via SSH

No seu computador local:

```bash
ssh usuario@IP_DA_VM
```

### 4.2 Instalar Git na VM (Ubuntu)

Na VM:

```bash
sudo apt update
sudo apt install -y git
git --version
```

### 4.3 Clonar o projeto na VM

Escolha uma pasta para o projeto e execute:

```bash
git clone URL_DO_SEU_REPOSITORIO receitas
cd receitas
```

Exemplo de URL HTTPS:

```bash
git clone https://github.com/seu-usuario/receitas.git receitas
```

### 4.4 Atualizar codigo quando houver mudancas (pull)

Dentro da pasta do projeto na VM:

```bash
cd ~/apps/receitas
git pull origin main
```

Se sua branch principal for `master`, troque `main` por `master`.

### 4.5 Instalar dependencias e configurar ambiente na VM

```bash
cd ~/apps/receitas
npm install
```

Depois, crie/edite o arquivo `.env` com os dados da VM.

### 4.6 Criar e popular o banco na VM

Ainda na VM, rode os mesmos comandos SQL deste README:

```bash
psql -U postgres -c "CREATE DATABASE receitas;"
psql -U postgres -d receitas -f ddl.sql
psql -U postgres -d receitas -f dml.sql
```

### 4.7 Subir a aplicacao na VM

```bash
npm start
```

Se quiser manter rodando em background sem fechar o terminal:

```bash
nohup npm start > app.log 2>&1 &
tail -f app.log
```

### 4.8 Abrir acesso da porta na VM

Se o firewall estiver ativo:

```bash
sudo ufw allow 3000
sudo ufw status
```

Depois acesse de fora da VM:

- http://IP_DA_VM:3000

## 5. Criar e popular o banco de dados

### 5.1 Criar banco `receitas`

```bash
psql -U postgres -c "CREATE DATABASE receitas;"
```

### 5.2 Executar scripts SQL

No diretorio raiz do projeto:

```bash
psql -U postgres -d receitas -f ddl.sql
psql -U postgres -d receitas -f dml.sql
```

### 5.3 Verificar dados inseridos

```bash
psql -U postgres -d receitas -c "SELECT * FROM usuario;"
psql -U postgres -d receitas -c "SELECT * FROM receita ORDER BY id;"
```

## 6. Configurar variaveis de ambiente

Crie/edite o arquivo `.env` na raiz:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=receitas
DB_USER=postgres
DB_PASSWORD=postgres
SESSION_SECRET=troque-esta-chave-em-producao
```

## 7. Rodar o projeto

```bash
npm start
```

Servidor esperado:

- URL: http://localhost:3000

## 8. Login para acessar os dados

Use o usuario de exemplo criado no `dml.sql`:

- Login: `admin`
- Senha: `1234`

Sem login, os endpoints protegidos retornam `401`.

## 9. Endpoints da API

### Publicos

- `POST /api/login`
- `POST /api/logout`

### Protegidos (exigem sessao ativa)

- `GET /api/health`
- `GET /api/receitas`

## 10. Explicacao do codigo

### 10.1 Backend (`server/server.js`)

- Carrega variaveis com `dotenv`.
- Cria pool de conexoes PostgreSQL com `pg`.
- Configura sessao com `express-session`.
- Middleware `requireAuth` bloqueia endpoints sem login.
- `POST /api/login` valida usuario na tabela `usuario` e grava sessao.
- `POST /api/logout` destroi a sessao.
- `GET /api/health` verifica conectividade com `SELECT 1`.
- `GET /api/receitas` retorna os dados de `receita`.
- Funcao `getDateColumnName` busca dinamicamente a coluna de data para manter compatibilidade do projeto.

### 10.2 Frontend

- `client/index.html`: estrutura da tela de login e da tabela de receitas.
- `client/style.css`: estilos simples da pagina.
- `client/app.js`:
  - envia login para `POST /api/login`
  - busca dados com `GET /api/health` e `GET /api/receitas`
  - trata erro `401` mostrando tela de login
  - executa logout com `POST /api/logout`

---

Pronto. Com isso, voce consegue configurar este projeto do zero em outra maquina e executar com login e acesso protegido aos endpoints.
