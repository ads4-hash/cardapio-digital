-- CreateTable
CREATE TABLE "Mesa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LIVRE',
    "estabelecimentoId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Mesa_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Comanda" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "mesaId" TEXT NOT NULL,
    "estabelecimentoId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "fechadoPorId" TEXT,
    "fechadoEm" DATETIME,
    "observacao" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Comanda_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Comanda_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Estabelecimento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "telefone" TEXT,
    "plano" TEXT NOT NULL DEFAULT 'DELIVERY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Estabelecimento" ("createdAt", "id", "nome", "slug", "telefone", "updatedAt") SELECT "createdAt", "id", "nome", "slug", "telefone", "updatedAt" FROM "Estabelecimento";
DROP TABLE "Estabelecimento";
ALTER TABLE "new_Estabelecimento" RENAME TO "Estabelecimento";
CREATE UNIQUE INDEX "Estabelecimento_slug_key" ON "Estabelecimento"("slug");
CREATE INDEX "Estabelecimento_slug_idx" ON "Estabelecimento"("slug");
CREATE TABLE "new_Pedido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cliente" TEXT NOT NULL,
    "tipoEntrega" TEXT NOT NULL DEFAULT 'RETIRADA',
    "endereco" TEXT,
    "telefone" TEXT,
    "taxaEntrega" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "total" DECIMAL NOT NULL,
    "formaPagamento" TEXT NOT NULL DEFAULT 'DINHEIRO',
    "trocoPara" DECIMAL,
    "origem" TEXT NOT NULL DEFAULT 'DELIVERY',
    "numeroMesa" INTEGER,
    "mesaId" TEXT,
    "comandaId" TEXT,
    "estabelecimentoId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pedido_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pedido_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "Comanda" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pedido_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Pedido" ("cliente", "createdAt", "endereco", "estabelecimentoId", "formaPagamento", "id", "status", "taxaEntrega", "telefone", "tipoEntrega", "total", "trocoPara", "updatedAt") SELECT "cliente", "createdAt", "endereco", "estabelecimentoId", "formaPagamento", "id", "status", "taxaEntrega", "telefone", "tipoEntrega", "total", "trocoPara", "updatedAt" FROM "Pedido";
DROP TABLE "Pedido";
ALTER TABLE "new_Pedido" RENAME TO "Pedido";
CREATE INDEX "Pedido_estabelecimentoId_idx" ON "Pedido"("estabelecimentoId");
CREATE INDEX "Pedido_estabelecimentoId_status_idx" ON "Pedido"("estabelecimentoId", "status");
CREATE INDEX "Pedido_estabelecimentoId_createdAt_idx" ON "Pedido"("estabelecimentoId", "createdAt");
CREATE INDEX "Pedido_comandaId_idx" ON "Pedido"("comandaId");
CREATE INDEX "Pedido_mesaId_idx" ON "Pedido"("mesaId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Mesa_estabelecimentoId_idx" ON "Mesa"("estabelecimentoId");

-- CreateIndex
CREATE INDEX "Mesa_estabelecimentoId_status_idx" ON "Mesa"("estabelecimentoId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Mesa_estabelecimentoId_numero_key" ON "Mesa"("estabelecimentoId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Comanda_codigo_key" ON "Comanda"("codigo");

-- CreateIndex
CREATE INDEX "Comanda_estabelecimentoId_status_idx" ON "Comanda"("estabelecimentoId", "status");

-- CreateIndex
CREATE INDEX "Comanda_mesaId_status_idx" ON "Comanda"("mesaId", "status");
