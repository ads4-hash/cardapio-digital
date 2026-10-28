# Arquitetura (ADR breve)

## Visão geral
O projeto é um **monorepo npm** com `backend/` (NestJS + Prisma + SQLite), `frontend/` (Angular 22 SSR), `packages/contratos/` (tipos compartilhados).

## Fluxo de pedido (cliente)
1. Cliente acessa `/cardapio/:slug` (público)
2. Monta carrinho com produtos/ingredientes (persistido no `localStorage`)
3. `POST /pedidos` cria pedido com status inicial (`pendente`)
4. WebSocket emite `pedido.criado` para painel admin
5. Cliente acompanha em `/pedido/:id/rastrear`

## Fluxo no painel (admin)
1. Login via `POST /auth/login` (JWT)
2. Painel recebe lista de pedidos via REST + atualizações em tempo real via Socket.IO
3. `PATCH /pedidos/:id/status` atualiza status → emite `pedido.atualizado`/eventos
4. Gestão de catálogo (produtos/categorias/ingredientes) e configurações

## Multi-tenant
- Cada estabelecimento tem `slug` próprio
- Endpoints públicos recebem `?slug=` para filtrar contexto
- Endpoints autenticados usam estabelecimento do token
- Dados isolados por `estabelecimentoId`

## Autenticação & segurança
- JWT (Bearer), refresh token via cookie HttpOnly
- bcrypt para senhas
- `ThrottlerGuard` com limites por rota/IP
- `helmet`, `ValidationPipe` (whitelist + forbidNonWhitelisted)
- CORS com origens validadas
- Upload com validação de magic bytes

## Observabilidade
- `LoggerPersonalizado` (json em produção, pretty em dev)
- `RegistroHttpInterceptor` + `X-Request-Id`
- `GET /health` e `GET /readyz` (verificação com banco)
- Filtro global de erros padronizado

## SSR (Angular)
- Servidor Node publica `PUBLIC_API_URL` em `/config.js` por requisição
- Variáveis: `API_URL` (SSR interno), `PUBLIC_API_URL` (browser), `ALLOWED_HOSTS`
- Sem rebuild para trocar URL da API

## Deploy
- Docker Compose com volumes para `uploads/` e `prisma/`
- Backend/frontend com healthchecks; frontend aguarda backend saudável
- CI cobre lint, typecheck, testes, e2e e build das imagens
