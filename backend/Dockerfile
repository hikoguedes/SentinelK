FROM node:20-alpine

WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o resto do código
COPY . .

# Expõe a porta da API
EXPOSE 3333

# Roda o servidor em modo de desenvolvimento (hot-reload)
CMD ["npm", "run", "dev"]
