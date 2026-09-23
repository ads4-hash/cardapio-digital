-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Pedido" ("cliente", "createdAt", "endereco", "id", "status", "taxaEntrega", "telefone", "tipoEntrega", "total", "updatedAt") SELECT "cliente", "createdAt", "endereco", "id", "status", "taxaEntrega", "telefone", "tipoEntrega", "total", "updatedAt" FROM "Pedido";
DROP TABLE "Pedido";
ALTER TABLE "new_Pedido" RENAME TO "Pedido";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
