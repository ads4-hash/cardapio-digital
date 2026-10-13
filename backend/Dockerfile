# Backend (NestJS + Prisma + SQLite)
# ATENÇÃO: o contexto de build é a RAIZ do repositório (workspace npm), não
# backend/. Veja docker-compose.yml -> build.context: .
# Construção: instala as dependências do workspace, gera o client do Prisma e
# compila o Nest.
FROM node:22-alpine AS build
WORKDIR /app

# Manifestos (camada de cache do npm)
COPY package.json package-lock.json ./
COPY packages/contratos/package.json packages/contratos/package.json
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci

# Código compartilhado + backend
COPY packages/contratos packages/contratos
COPY backend backend

# Prisma: gera o client a partir do schema
RUN npx prisma generate --schema backend/prisma/schema.prisma

RUN npm run build --workspace backend

# Imagem final: apenas runtime (sem devDependencies e sem fontes)
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages/contratos/package.json packages/contratos/package.json
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --omit=dev

COPY backend/prisma backend/prisma
RUN npx prisma generate --schema backend/prisma/schema.prisma

COPY --from=build /app/backend/dist backend/dist

WORKDIR /app/backend
# Aplica as migrações e inicia a API
ENV PORT=3000
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
