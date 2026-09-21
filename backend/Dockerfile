# Backend (NestJS + Prisma + SQLite)
# Construção: instala dependências, gera o client do Prisma e compila o Nest
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# Imagem final: apenas runtime (sem devDependencies e sem fontes)
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npx prisma generate
COPY --from=build /app/dist ./dist
COPY prisma ./prisma

# Aplica as migrações e inicia a API
ENV PORT=3000
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]