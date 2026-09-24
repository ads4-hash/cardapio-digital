-- CreateTable
CREATE TABLE "Estabelecimento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "telefone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- InsertEstabelecimentoPadrao: mantém os dados existentes no sistema
INSERT INTO "Estabelecimento" ("id", "nome", "slug", "telefone", "createdAt", "updatedAt")
VALUES ('00000000-0000-0000-0000-000000000001', 'Meu Estabelecimento', 'meu-estabelecimento', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Categoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "visivel" BOOLEAN NOT NULL DEFAULT true,
    "estabelecimentoId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Categoria_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Categoria" ("estabelecimentoId", "createdAt", "id", "nome", "updatedAt", "visivel") SELECT '00000000-0000-0000-0000-000000000001', "createdAt", "id", "nome", "updatedAt", "visivel" FROM "Categoria";
DROP TABLE "Categoria";
ALTER TABLE "new_Categoria" RENAME TO "Categoria";
CREATE TABLE "new_Configuracao" (
    "estabelecimentoId" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    PRIMARY KEY ("estabelecimentoId", "chave"),
    CONSTRAINT "Configuracao_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Configuracao" ("estabelecimentoId", "chave", "valor") SELECT '00000000-0000-0000-0000-000000000001', "chave", "valor" FROM "Configuracao";
DROP TABLE "Configuracao";
ALTER TABLE "new_Configuracao" RENAME TO "Configuracao";
CREATE TABLE "new_Ingrediente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "estabelecimentoId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ingrediente_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Ingrediente" ("estabelecimentoId", "createdAt", "id", "nome", "updatedAt") SELECT '00000000-0000-0000-0000-000000000001', "createdAt", "id", "nome", "updatedAt" FROM "Ingrediente";
DROP TABLE "Ingrediente";
ALTER TABLE "new_Ingrediente" RENAME TO "Ingrediente";
CREATE TABLE "new_Pedido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cliente" TEXT NOT NULL,
    "tipoEntrega" TEXT NOT NULL DEFAULT 'RETIRADA',
    "endereco" TEXT,
    "telefone" TEXT,
    "taxaEntrega" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "total" REAL NOT NULL,
    "formaPagamento" TEXT NOT NULL DEFAULT 'DINHEIRO',
    "trocoPara" REAL,
    "estabelecimentoId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pedido_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Pedido" ("cliente", "createdAt", "endereco", "estabelecimentoId", "formaPagamento", "id", "status", "taxaEntrega", "telefone", "tipoEntrega", "total", "trocoPara", "updatedAt") SELECT "cliente", "createdAt", "endereco", '00000000-0000-0000-0000-000000000001', "formaPagamento", "id", "status", "taxaEntrega", "telefone", "tipoEntrega", "total", "trocoPara", "updatedAt" FROM "Pedido";
DROP TABLE "Pedido";
ALTER TABLE "new_Pedido" RENAME TO "Pedido";
CREATE TABLE "new_Produto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "preco" REAL NOT NULL,
    "imagemUrl" TEXT,
    "estabelecimentoId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Produto_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Produto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Produto" ("categoriaId", "createdAt", "descricao", "estabelecimentoId", "id", "imagemUrl", "nome", "preco", "updatedAt") SELECT "categoriaId", "createdAt", "descricao", '00000000-0000-0000-0000-000000000001', "id", "imagemUrl", "nome", "preco", "updatedAt" FROM "Produto";
DROP TABLE "Produto";
ALTER TABLE "new_Produto" RENAME TO "Produto";
CREATE TABLE "new_Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "estabelecimentoId" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "Usuario_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Usuario" ("atualizadoEm", "criadoEm", "email", "estabelecimentoId", "id", "nome", "senhaHash") SELECT "atualizadoEm", "criadoEm", "email", '00000000-0000-0000-0000-000000000001', "id", "nome", "senhaHash" FROM "Usuario";
DROP TABLE "Usuario";
ALTER TABLE "new_Usuario" RENAME TO "Usuario";
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Estabelecimento_slug_key" ON "Estabelecimento"("slug");
