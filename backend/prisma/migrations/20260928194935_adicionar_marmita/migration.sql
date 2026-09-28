-- CreateTable
CREATE TABLE "ProdutoGrupo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "produtoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "maximoEscolhas" INTEGER NOT NULL DEFAULT 99,
    CONSTRAINT "ProdutoGrupo_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Produto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "preco" REAL NOT NULL,
    "imagemUrl" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'PADRAO',
    "estabelecimentoId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Produto_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Produto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Produto" ("categoriaId", "createdAt", "descricao", "estabelecimentoId", "id", "imagemUrl", "nome", "preco", "updatedAt") SELECT "categoriaId", "createdAt", "descricao", "estabelecimentoId", "id", "imagemUrl", "nome", "preco", "updatedAt" FROM "Produto";
DROP TABLE "Produto";
ALTER TABLE "new_Produto" RENAME TO "Produto";
CREATE TABLE "new_ProdutoIngrediente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "produtoId" TEXT NOT NULL,
    "ingredienteId" TEXT NOT NULL,
    "precoAdicional" REAL NOT NULL DEFAULT 0,
    "grupoId" TEXT,
    CONSTRAINT "ProdutoIngrediente_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProdutoIngrediente_ingredienteId_fkey" FOREIGN KEY ("ingredienteId") REFERENCES "Ingrediente" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProdutoIngrediente_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "ProdutoGrupo" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProdutoIngrediente" ("id", "ingredienteId", "precoAdicional", "produtoId") SELECT "id", "ingredienteId", "precoAdicional", "produtoId" FROM "ProdutoIngrediente";
DROP TABLE "ProdutoIngrediente";
ALTER TABLE "new_ProdutoIngrediente" RENAME TO "ProdutoIngrediente";
CREATE INDEX "ProdutoIngrediente_grupoId_idx" ON "ProdutoIngrediente"("grupoId");
CREATE UNIQUE INDEX "ProdutoIngrediente_produtoId_ingredienteId_key" ON "ProdutoIngrediente"("produtoId", "ingredienteId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ProdutoGrupo_produtoId_nome_key" ON "ProdutoGrupo"("produtoId", "nome");
