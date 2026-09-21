# Frontend (Angular 22 com SSR/hidratação)
# Construção: instala dependências e gera o build de produção
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Imagem final: executa o servidor SSR no Node
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

ENV PORT=4000
EXPOSE 4000
CMD ["node", "dist/Projetinho/server/server.mjs"]