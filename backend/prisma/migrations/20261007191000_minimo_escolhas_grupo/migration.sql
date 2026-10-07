-- Piso de porções do grupo: com 1 o cliente é obrigado a escolher no grupo.
ALTER TABLE "ProdutoGrupo" ADD COLUMN "minimoEscolhas" INTEGER NOT NULL DEFAULT 0;
