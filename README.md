# Cardápio Digital — Projetinho

Sistema de cardápio digital com pedidos em tempo real para restaurantes: o cliente
visualiza o cardápio, monta o pedido (com ingredientes opcionais), e a casa
acompanha e atualiza o status instantaneamente.

## Stack

| Camada    | Tecnologias |
|-----------|-------------|
| Backend   | NestJS 11, Prisma 5 (SQLite), JWT, bcrypt, Socket.IO (WebSocket), Helmet, Throttler |
| Frontend  | Angular 22 (standalone, signals, SSR + hidratação), RxJS, socket.io-client |
| Deploy    | Docker + docker-compose |

## Estrutura

```
backend/   API REST + WebSocket (porta 3000)
frontend/  Aplicação Angular com SSR (porta 4200 em dev, 4000 em produção)
docker-compose.yml  Subida do projeto completo
```

## Rodando em desenvolvimento

### Backend

```bash
cd backend
cp .env.example .env   # preencha o JWT_SECRET com um valor longo e aleatório
npm install
npx prisma migrate deploy
npx prisma db seed      # opcional: popula categorias/produtos/ingredientes
npm run start:dev       # http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
npm start               # http://localhost:4200
```

> O frontend chama a API em `http://localhost:3000` (veja `frontend/src/app/environment.ts`).

### Primeiro acesso ao painel

O cadastro de usuário (`POST /auth/registrar`) só cria o **primeiro** usuário — que
vira administrador. Depois dele, o endpoint é bloqueado e o acesso passa a ser
apenas via login (`POST /auth/login`).

## Variáveis de ambiente (backend — `.env`)

| Variável      | Padrão | Descrição |
|---------------|--------|-----------|
| `DATABASE_URL`| `file:./dev.db` | Banco SQLite (relativo ao `prisma/`) |
| `JWT_SECRET`  | — | Obrigatório em produção. Segredo dos tokens JWT e hash de IPs |
| `PORT`        | `3000` | Porta da API |
| `CORS_ORIGIN` | `http://localhost:4200` | Origens permitidas, separadas por vírgula |
| `CONFIAR_PROXY` | `false` | Defina `"true"` apenas atrás de proxy que preenche `X-Forwarded-For` |

## Rodando com Docker

```bash
cp backend/.env.example backend/.env   # preencha e ajuste as variáveis
docker compose up -d --build
```

- API: `http://localhost:3000`
- Cardápio/painel: `http://localhost:4000`

Volumes persistidos: imagens de produtos (`uploads`) e o banco SQLite (`prisma/`).

## Funcionalidades

- **Cliente**: cardápio por categoria, busca, carrinho persistente (localStorage),
  personalização de ingredientes, checkout e acompanhamento do pedido (`/pedido/:id`)
  com atualização automática.
- **Administrador**: gestão de produtos/ingredientes/categorias, visibilidade de
  categorias, upload de imagens, pedidos em tempo real via WebSocket e compartilhamento
  do cardápio público.
- **Segurança**: senhas com bcrypt, JWT, rate limiting (login/registro e global),
  validação de conteúdo de imagens (magic bytes), Helmet, bloqueio de segundo admin,
  respostas de erro padronizadas em pt-BR.

## Testes e checagens

```bash
# Backend: build + lint
cd backend
npm run build
npm run lint

# Frontend: build + testes
cd frontend
npm run build
npm test        # ng test (Vitest, sem watch)
```

## Rotas principais da API

| Método  | Rota                       | Acesso       | Descrição |
|---------|----------------------------|--------------|-----------|
| POST    | `/auth/registrar`          | público (1º usuário) | Cria o administrador |
| POST    | `/auth/login`              | público      | Gera o token JWT |
| GET     | `/categorias`, `/produtos`, `/ingredientes`, `/pedidos` | público leitura | Listagens (filtradas p/ não logados) |
| POST    | `/pedidos`                 | público      | Cria pedido (cliente) |
| GET     | `/pedidos/:id/rastrear`    | público      | Acompanhamento do pedido |
| POST    | `/upload`                  | admin        | Envio de imagem (JPG/PNG/WEBP/GIF, até 5 MB) |
| CRUD    | `/produtos`, `/categorias`, `/ingredientes`, `/pedidos/:id/status` | admin | Gestão |
| WS      | `pedido.criado`, `pedido.atualizado`, `pedido.removido` | admin | Tempo real |