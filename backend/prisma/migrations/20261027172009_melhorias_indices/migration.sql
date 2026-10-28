-- CreateIndex
CREATE INDEX "Estabelecimento_slug_idx" ON "Estabelecimento"("slug");

-- CreateIndex
CREATE INDEX "Ingrediente_estabelecimentoId_nome_idx" ON "Ingrediente"("estabelecimentoId", "nome");

-- CreateIndex
CREATE INDEX "Pedido_estabelecimentoId_createdAt_idx" ON "Pedido"("estabelecimentoId", "createdAt");

-- CreateIndex
CREATE INDEX "Produto_estabelecimentoId_categoriaId_idx" ON "Produto"("estabelecimentoId", "categoriaId");
