-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ItemPedido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quantidade" INTEGER NOT NULL,
    "preco" DECIMAL NOT NULL,
    "removidos" TEXT NOT NULL DEFAULT '[]',
    "adicionados" TEXT NOT NULL DEFAULT '[]',
    "pedidoId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    CONSTRAINT "ItemPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemPedido_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ItemPedido" ("adicionados", "id", "pedidoId", "preco", "produtoId", "quantidade", "removidos") SELECT "adicionados", "id", "pedidoId", "preco", "produtoId", "quantidade", "removidos" FROM "ItemPedido";
DROP TABLE "ItemPedido";
ALTER TABLE "new_ItemPedido" RENAME TO "ItemPedido";
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
    "estabelecimentoId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pedido_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Pedido" ("cliente", "createdAt", "endereco", "estabelecimentoId", "formaPagamento", "id", "status", "taxaEntrega", "telefone", "tipoEntrega", "total", "trocoPara", "updatedAt") SELECT "cliente", "createdAt", "endereco", "estabelecimentoId", "formaPagamento", "id", "status", "taxaEntrega", "telefone", "tipoEntrega", "total", "trocoPara", "updatedAt" FROM "Pedido";
DROP TABLE "Pedido";
ALTER TABLE "new_Pedido" RENAME TO "Pedido";
CREATE TABLE "new_Produto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "preco" DECIMAL NOT NULL,
    "imagemUrl" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'PADRAO',
    "estabelecimentoId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Produto_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Produto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Produto" ("categoriaId", "createdAt", "descricao", "estabelecimentoId", "id", "imagemUrl", "nome", "preco", "tipo", "updatedAt") SELECT "categoriaId", "createdAt", "descricao", "estabelecimentoId", "id", "imagemUrl", "nome", "preco", "tipo", "updatedAt" FROM "Produto";
DROP TABLE "Produto";
ALTER TABLE "new_Produto" RENAME TO "Produto";
CREATE TABLE "new_ProdutoIngrediente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "produtoId" TEXT NOT NULL,
    "ingredienteId" TEXT NOT NULL,
    "precoAdicional" DECIMAL NOT NULL DEFAULT 0,
    "grupoId" TEXT,
    CONSTRAINT "ProdutoIngrediente_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProdutoIngrediente_ingredienteId_fkey" FOREIGN KEY ("ingredienteId") REFERENCES "Ingrediente" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProdutoIngrediente_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "ProdutoGrupo" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProdutoIngrediente" ("grupoId", "id", "ingredienteId", "precoAdicional", "produtoId") SELECT "grupoId", "id", "ingredienteId", "precoAdicional", "produtoId" FROM "ProdutoIngrediente";
DROP TABLE "ProdutoIngrediente";
ALTER TABLE "new_ProdutoIngrediente" RENAME TO "ProdutoIngrediente";
CREATE INDEX "ProdutoIngrediente_grupoId_idx" ON "ProdutoIngrediente"("grupoId");
CREATE UNIQUE INDEX "ProdutoIngrediente_produtoId_ingredienteId_key" ON "ProdutoIngrediente"("produtoId", "ingredienteId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
