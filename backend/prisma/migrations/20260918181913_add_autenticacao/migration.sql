-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TentativaLogin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ipHash" TEXT NOT NULL,
    "sucesso" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_nome_key" ON "Usuario"("nome");

-- CreateIndex
CREATE INDEX "TentativaLogin_ipHash_criadoEm_idx" ON "TentativaLogin"("ipHash", "criadoEm");
