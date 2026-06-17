FROM node:20-alpine

WORKDIR /app

# Copia os arquivos de dependências primeiro (Melhora o cache e velocidade de build)
COPY package*.json ./
RUN npm install

# Copia o restante do código fonte
COPY . .

# Expõe a porta padrão que o seu server.js utiliza
EXPOSE 3000

CMD ["node", "server/server.js"]