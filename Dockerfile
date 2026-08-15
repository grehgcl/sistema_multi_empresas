# Dockerfile
FROM node:18-alpine

# Instalar dependências do sistema para compilar o SQLite
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite-dev

# Criar diretório da aplicação
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm install --production=false

# Copiar o restante da aplicação
COPY . .

# Criar pasta para os bancos
RUN mkdir -p /app/database

# Expor a porta
EXPOSE 3000

# Comando para iniciar
CMD ["npm", "start"]