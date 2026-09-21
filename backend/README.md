# Backend — Cardápio Digital

API REST + WebSocket do cardápio digital (NestJS 11 + Prisma 5/SQLite).

## Setup

```bash
cp .env.example .env   # preencha o JWT_SECRET
npm install
npx prisma migrate deploy
npx prisma db seed      # opcional
```

## Scripts

```bash
npm run start:dev   # desenvolvimento (watch)
npm run build       # compila para dist/
npm run start:prod  # executa dist/main
npm run lint        # ESLint
```

## Testes

```bash
npm test            # Jest (unit)
npm run test:e2e    # e2e (supertest)
```

Veja o `README.md` da raiz para variáveis de ambiente, rotas e deploy com Docker.