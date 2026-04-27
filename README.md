# Projeto Receitas

Aplicacao web simples com:

- Tela de login
- API Node.js + Express
- Banco PostgreSQL
- Listagem da tabela `receita` para usuario autenticado

## 1. Requisitos

- Node.js LTS
- npm (vem com Node.js)
- Git
- PostgreSQL

## 2. Instalacao no Linux/Ubuntu

```bash
sudo apt update
sudo apt install -y nodejs npm
sudo apt install -y postgresql postgresql-contrib
sudo apt install -y git
```

Liberar porta '3000' para Node:

```bash
ufw allow 3000
```

## 3. Clonar o projeto na VM

Escolha uma pasta para o projeto e execute:

```bash
git clone https://github.com/RafaEdu/receitas.git receitas
cd receitas
```

## 4. Baixar o projeto e instalar dependencias

No diretorio raiz do projeto:

```bash
npm install
```

Depois, edite o arquivo `.env` se necessário.

## 5. Criar e popular o banco na VM

Os arquivos para criar e popular o banco se encontram dentro do projeto git.
Portanto, ainda dentro do projeto, rode os comandos abaixo para criar e popular o banco.:

```bash
sudo -u postgres psql -c "CREATE DATABASE receitas;"
sudo -u postgres psql -d receitas -f ddl.sql
sudo -u postgres psql -d receitas -f dml.sql
```

### 6. Subir a aplicação na VM

```bash
npm start
```

Depois acesse de fora da VM:
http://177.44.248.43:3000

- Login: `admin`
- Senha: `1234`

Sem login, os endpoints protegidos retornam `401`.

## 7. Endpoints da API

### Publicos

- `POST /api/login`
- `POST /api/logout`

### Protegidos (exigem sessao ativa)

- `GET /api/health`
- `GET /api/receitas`

## 8. Notificacao por e-mail

Sempre que uma receita for criada (`POST /api/receitas`) ou editada (`PUT /api/receitas/:id`), o backend envia automaticamente um e-mail de notificacao.

Se o envio do e-mail falhar, a criacao/edicao da receita continua normalmente e a API retorna um aviso no campo `warning` da resposta.

### Configuracao

Preencha no `.env` (ou em variaveis de ambiente do servidor):

- `RECEITAS_NOTIFICATION_TO` (destinatario fixo da notificacao)
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`

Recomendacao de seguranca para GitHub:

- Mantenha `SMTP_PASSWORD` vazio no `.env` versionado.
- Crie um arquivo `.env.local` (ignorado pelo Git) com:

```dotenv
SMTP_PASSWORD=sua_senha_de_app
```

O backend carrega `.env` e depois `.env.local` com prioridade para os valores locais.

Exemplo para Gmail (SMTP SSL):

- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=465`
- `SMTP_SECURE=true`
- `SMTP_USER=rafael.dreissig@universo.univates.br`
- `SMTP_FROM=rafael.dreissig@universo.univates.br`
- `SMTP_PASSWORD=<senha de app do Google>`

### Seguranca do destinatario

- O endereco de destino fica apenas no backend (variavel de ambiente).
- O frontend nao recebe nem exibe esse endereco.
- As respostas da API nao retornam o e-mail de destino.

Tempo para cada etapa:

- Desenvolvimento da aplicação: 1 hora 10 minutos;
- Criação do ambiente na VM: 10 min
- Publicação da aplicação: 2 min
