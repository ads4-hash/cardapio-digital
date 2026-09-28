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

## Documentação da API

Com a API no ar, a documentação fica em:

| Endereço | Conteúdo |
| --- | --- |
| `http://localhost:3000/docs` | Swagger UI para ler e executar as rotas |
| `http://localhost:3000/docs-json` | Especificação OpenAPI, para gerar cliente ou importar no Postman/Insomnia |

A UI não depende de CDN (os assets do `swagger-ui-dist` são servidos pela própria
API), então funciona offline e em rede restrita.

Os esquemas de resposta são gerados a partir de classes em `src/**/dto/respostas-*.dto.ts`
e os corpos de entrada a partir dos DTOs com `class-validator`, pelo plugin do Swagger
configurado em `nest-cli.json`. Os comentários JSDoc desses DTOs viram a descrição dos
campos, então vale documentá-los junto da validação.

Para desligar a documentação (por exemplo, em produção), defina:

```bash
DOCS_HABILITADOS="false"
```

Veja o `README.md` da raiz para variáveis de ambiente, rotas e deploy com Docker.