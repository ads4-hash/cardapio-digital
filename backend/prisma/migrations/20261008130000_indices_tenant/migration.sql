-- CreateIndex
CREATE INDEX "Categoria_estabelecimentoId_idx" ON "Categoria"("estabelecimentoId");

-- CreateIndex
CREATE INDEX "Ingrediente_estabelecimentoId_idx" ON "Ingrediente"("estabelecimentoId");

-- CreateIndex
CREATE INDEX "ItemPedido_pedidoId_idx" ON "ItemPedido"("pedidoId");

-- CreateIndex
CREATE INDEX "ItemPedido_produtoId_idx" ON "ItemPedido"("produtoId");

-- CreateIndex
CREATE INDEX "Pedido_estabelecimentoId_idx" ON "Pedido"("estabelecimentoId");

-- CreateIndex
CREATE INDEX "Pedido_estabelecimentoId_status_idx" ON "Pedido"("estabelecimentoId", "status");

-- CreateIndex
CREATE INDEX "Produto_estabelecimentoId_idx" ON "Produto"("estabelecimentoId");

-- CreateIndex
CREATE INDEX "Produto_categoriaId_idx" ON "Produto"("categoriaId");

-- CreateIndex
CREATE INDEX "Usuario_estabelecimentoId_idx" ON "Usuario"("estabelecimentoId");
