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
backend/            API REST + WebSocket (porta 3000)
frontend/           Aplicação Angular com SSR (porta 4200 em dev, 4000 em produção)
packages/contratos/ Tipos compartilhados entre backend e frontend (@projetinho/contratos)
docker-compose.yml  Subida do projeto completo
```

O repositório é um **workspace npm** (uma única instalação na raiz e um único
`package-lock.json`). O pacote `@projetinho/contratos` concentra os tipos das
respostas/payloads da API, consumidos pelos dois lados via `import type`; os DTOs
de resposta do backend usam `implements` para garantir, em tempo de compilação,
que continuam compatíveis com o contrato.

## Rodando em desenvolvimento

Instale as dependências **uma vez, na raiz** (workspace npm):

```bash
npm install
```

### Backend

```bash
cd backend
cp .env.example .env   # preencha o JWT_SECRET com um valor longo e aleatório
npx prisma migrate deploy
npx prisma db seed      # opcional: popula categorias/produtos/ingredientes
npm run start:dev       # http://localhost:3000
```

### Frontend

```bash
cd frontend
npm start               # http://localhost:4200
```

> O frontend chama a API em `http://localhost:3000` (veja `frontend/src/app/environment.ts`).

### Variáveis de ambiente (frontend — em deploy)

Sem variável nenhuma, o app usa `http://localhost:3000` para a API.

| Variável         | Padrão                 | Descrição |
|------------------|------------------------|-----------|
| `PUBLIC_API_URL` | `http://localhost:3000` | URL da API **para o navegador** (XHR, WebSocket e `src` das imagens) |
| `API_URL`        | `http://localhost:3000` | URL da API **para o servidor SSR** (rede interna, ex.: `http://backend:3000`) |
| `ALLOWED_HOSTS`  | `localhost,127.0.0.1` | Hosts aceitos no SSR. Domínios separados por vírgula; `"*"` só atrás de proxy que já valida o `Host` |

O bundle do browser não tem `process.env`, então o servidor SSR publica `PUBLIC_API_URL`
em `/config.js`, carregado no `<head>` antes dos bundles. Como a rota é gerada por
requisição, mudar a URL no `docker-compose` não exige rebuild.

### Criar conta (onboarding)

Qualquer pessoa cria a própria loja pela tela **Criar conta** (`POST /auth/registrar`):
cada cadastro gera um novo estabelecimento com `slug` próprio (URL `/cardapio/:slug`)
e o administrador dele. O e-mail precisa ser único e o cadastro é limitado a 5/min por IP.

## Variáveis de ambiente (backend — `.env`)

| Variável      | Padrão | Descrição |
|---------------|--------|-----------|
| `DATABASE_URL`| `file:./dev.db` | Banco SQLite (relativo ao `prisma/`) |
| `JWT_SECRET`  | — | Obrigatório em produção. Segredo dos tokens JWT e hash de IPs |
| `PORT`        | `3000` | Porta da API |
| `CORS_ORIGIN` | `http://localhost:4200`, `http://localhost:4000`, `http://127.0.0.1:4200`, `http://127.0.0.1:4000` | Origens permitidas, separadas por vírgula (URLs completas, com esquema) |
| `CONFIAR_PROXY` | `false` | Defina `"true"` apenas atrás de proxy que preenche `X-Forwarded-For` |
| `DOCS_HABILITADOS` | `true` (dev) / `false` (produção) | Force `"true"`/`"false"`; sem nada, o Swagger fica ligado só fora de produção |

Na partida, a API **valida o ambiente** e encerra com uma mensagem apontando a
variável culpada se algo estiver inconsistente (ex.: `CORS_ORIGIN` com URL sem
esquema, `PORT` não numérica ou `COOKIE_SAMESITE=none` sem `Secure`). Em seguida
imprime um resumo do que foi lido — porta, origens CORS, cookie de refresh e
proxy — para não restar dúvida sobre o que o processo entendeu do deploy.

### Envio de e-mail (SMTP) — recuperação de senha

Sem SMTP configurado, o backend roda em **modo local**: o código de recuperação
não é enviado por e-mail e volta na resposta da API (exibido na tela). Isso só
vale fora de produção — em produção, sem SMTP a recuperação responde `503`.

Para enviar de verdade, preencha em `backend/.env`:

| Variável | Exemplo | Descrição |
|----------|---------|-----------|
| `SMTP_HOST` | `smtp.gmail.com` | Servidor SMTP. Vazio = modo local |
| `SMTP_PORT` | `587` | Porta (587 = STARTTLS, 465 = TLS direto) |
| `SMTP_SECURE` | `false` | `"true"` para porta 465; `"false"` para 587 |
| `SMTP_USER` | `seuemail@gmail.com` | Usuário autenticado |
| `SMTP_PASS` | `senha-de-app` | Senha/token de app (nunca a senha normal) |
| `SMTP_FROM` | `Cardápio <seuemail@gmail.com>` | Remetente (normalmente o mesmo do `SMTP_USER`) |
| `FRONTEND_URL` | `https://seucardapio.com` | Base do link de recuperação enviado no e-mail |

Exemplo com Gmail (exige verificação em 2 etapas e **senha de app**):

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE="false"
SMTP_USER="seuemail@gmail.com"
SMTP_PASS="abcd efgh ijkl mnop"   # senha de app (sem espaços)
SMTP_FROM="Seu Cardápio <seuemail@gmail.com>"
FRONTEND_URL="https://seucardapio.com"
```

Depois de configurar, valide o envio (dentro do workspace do backend):

```bash
npm run email:teste --workspace backend -- voce@exemplo.com
```

O script usa a mesma configuração da API e envia um e-mail de teste. Reinicie o
backend para a nova configuração entrar em vigor.

## Rodando com Docker

```bash
cp backend/.env.example backend/.env   # preencha e ajuste as variáveis
docker compose up -d --build
```

- API: `http://localhost:3000`
- Cardápio/painel: `http://localhost:4000`

Volumes persistidos: imagens de produtos (`uploads`) e o banco SQLite (`prisma/`).

Em um deploy real, exporte `PUBLIC_API_URL` e `ALLOWED_HOSTS` com o domínio
público antes do `docker compose up`:

```bash
PUBLIC_API_URL=https://api.seudominio.com ALLOWED_HOSTS=seudominio.com docker compose up -d --build
```

## Funcionalidades

- **Cliente**: cardápio por categoria, busca, carrinho persistente (localStorage),
  personalização de ingredientes, checkout e acompanhamento do pedido (`/pedido/:id`)
  com atualização automática.
- **Administrador**: gestão de produtos/ingredientes/categorias, visibilidade de
  categorias, upload de imagens, pedidos em tempo real via WebSocket e compartilhamento
  do cardápio público.
- **Segurança**: senhas com bcrypt, JWT, rate limiting (login/registro e global),
  validação de conteúdo de imagens (magic bytes), Helmet, respostas de erro
  padronizadas em pt-BR.

## Testes e checagens

```bash
# Instale as dependências na raiz (workspace) antes de tudo
npm install

# Backend: build + lint + testes
npm run build --workspace backend
npm run lint --workspace backend
npm test --workspace backend

# Frontend: build + testes
npm run build --workspace frontend
npm test --workspace frontend   # ng test (Vitest, sem watch)
```

## Rotas principais da API

| Método  | Rota                       | Acesso       | Descrição |
|---------|----------------------------|--------------|-----------|
| POST    | `/auth/registrar`          | público      | Cria o estabelecimento + administrador (onboarding) |
| POST    | `/auth/login`              | público      | Gera o token JWT |
| GET     | `/categorias`, `/produtos`, `/ingredientes` | público leitura | Listagens (ocultas p/ não logados) |
| GET     | `/pedidos`                   | admin        | Listagem do painel: aceita `?pagina=&tamanhoPagina=&status=` (sem parâmetros, devolve tudo) |
| POST    | `/pedidos`                   | público      | Cria pedido (cliente) |
| GET     | `/pedidos/:id/rastrear`      | público      | Acompanhamento do pedido |
| POST    | `/upload`                    | admin        | Envio de imagem (JPG/PNG/WEBP/GIF, até 5 MB) |
| CRUD    | `/produtos`, `/categorias`, `/ingredientes`, `/pedidos/:id/status` | admin | Gestão |
| WS      | `pedido.criado`, `pedido.atualizado`, `pedido.removido` | admin | Tempo real |

A lista completa, com exemplos de request/response e botão de execução, está no
Swagger: `http://localhost:3000/docs`. A especificação OpenAPI fica em
`http://localhost:3000/docs-json`.