# Frontend (Angular 22 com SSR/hidratação)
# ATENÇÃO: o contexto de build é a RAIZ do repositório (workspace npm), não
# frontend/. Veja docker-compose.yml -> build.context: .
# Construção: instala as dependências do workspace e gera o build de produção.
FROM node:22-alpine AS build
WORKDIR /app

# Manifestos (camada de cache do npm)
COPY package.json package-lock.json ./
COPY packages/contratos/package.json packages/contratos/package.json
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci

# Código compartilhado + frontend
COPY packages/contratos packages/contratos
COPY frontend frontend

RUN npm run build --workspace frontend

# Imagem final: executa o servidor SSR no Node
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages/contratos/package.json packages/contratos/package.json
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --omit=dev

COPY --from=build /app/frontend/dist frontend/dist

WORKDIR /app/frontend
ENV PORT=4000
EXPOSE 4000
CMD ["node", "dist/Projetinho/server/server.mjs"]
