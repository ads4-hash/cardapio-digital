import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Limpa registros anteriores para evitar duplicatas ao rodar novamente
  await prisma.itemPedido.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.produtoIngrediente.deleteMany();
  await prisma.ingrediente.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.categoria.deleteMany();

  // Estabelecimento padrão do seed (mesmo slug/casos usados na migration)
  const estabelecimento = await prisma.estabelecimento.upsert({
    where: { slug: 'meu-estabelecimento' },
    update: {},
    create: {
      nome: 'Meu Estabelecimento',
      slug: 'meu-estabelecimento',
    },
  });

  console.log('🌱 Criando categorias...');

  const lanches = await prisma.categoria.create({
    data: {
      nome: 'Lanches',
      estabelecimentoId: estabelecimento.id,
    },
  });

  const bebidas = await prisma.categoria.create({
    data: {
      nome: 'Bebidas',
      estabelecimentoId: estabelecimento.id,
    },
  });

  const sobremesas = await prisma.categoria.create({
    data: {
      nome: 'Sobremesas',
      estabelecimentoId: estabelecimento.id,
    },
  });

  console.log('🧀 Criando ingredientes...');

  const ingredientes: Record<string, { nome: string; preco?: number }> = {
    pao_brioche: { nome: 'Pão brioche' },
    pao_tradicional: { nome: 'Pão tradicional' },
    hamburguer_180: { nome: 'Hambúrguer 180g' },
    hamburguer_150: { nome: 'Hambúrguer 150g' },
    cheddar: { nome: 'Queijo cheddar' },
    queijo: { nome: 'Queijo' },
    alface: { nome: 'Alface' },
    tomate: { nome: 'Tomate' },
    maionese: { nome: 'Maionese da casa' },
    molho_especial: { nome: 'Molho especial' },
    bacon: { nome: 'Bacon', preco: 4 },
    ovo: { nome: 'Ovo', preco: 3 },
    cebola: { nome: 'Cebola caramelizada', preco: 2 },
  };

  const criados: Record<string, { id: string }> = {};
  for (const [chave, dados] of Object.entries(ingredientes)) {
    criados[chave] = await prisma.ingrediente.create({
      data: { nome: dados.nome, estabelecimentoId: estabelecimento.id },
    });
  }

  console.log('🍔 Criando produtos...');

  const vincular = (
    ingredientesDoProduto: { chave: string; preco?: number }[],
  ) =>
    Object.fromEntries(
      ingredientesDoProduto.map(({ chave, preco }) => [
        criados[chave].id,
        { precoAdicional: preco ?? 0 },
      ]),
    );

  await prisma.produto.create({
    data: {
      nome: 'X-Burguer Artesanal',
      descricao: 'Pão brioche, hambúrguer de 180g, queijo cheddar e molho especial.',
      preco: 28.9,
      estabelecimentoId: estabelecimento.id,
      categoriaId: lanches.id,
      ingredientes: {
        createMany: {
          data: Object.entries(
            vincular([
              { chave: 'pao_brioche' },
              { chave: 'hamburguer_180' },
              { chave: 'cheddar' },
              { chave: 'molho_especial' },
              { chave: 'bacon', preco: 4 },
              { chave: 'ovo', preco: 3 },
              { chave: 'cebola', preco: 2 },
            ]),
          ).map(([ingredienteId, extra]) => ({
            ingredienteId,
            precoAdicional: (extra as { precoAdicional: number }).precoAdicional,
          })),
        },
      },
    },
  });

  await prisma.produto.create({
    data: {
      nome: 'X-Salada Especial',
      descricao: 'Pão tradicional, hambúrguer de 150g, queijo, alface, tomate e maionese da casa.',
      preco: 24.5,
      estabelecimentoId: estabelecimento.id,
      categoriaId: lanches.id,
      ingredientes: {
        createMany: {
          data: Object.entries(
            vincular([
              { chave: 'pao_tradicional' },
              { chave: 'hamburguer_150' },
              { chave: 'queijo' },
              { chave: 'alface' },
              { chave: 'tomate' },
              { chave: 'maionese' },
              { chave: 'bacon', preco: 4 },
              { chave: 'ovo', preco: 3 },
              { chave: 'cebola', preco: 2 },
            ]),
          ).map(([ingredienteId, extra]) => ({
            ingredienteId,
            precoAdicional: (extra as { precoAdicional: number }).precoAdicional,
          })),
        },
      },
    },
  });

  await prisma.produto.createMany({
    data: [
      {
        nome: 'Refrigerante Lata 350ml',
        descricao: 'Coca-Cola, Guaraná Antarctica ou Sprite.',
        preco: 6.0,
        estabelecimentoId: estabelecimento.id,
        categoriaId: bebidas.id,
      },
      {
        nome: 'Suco Natural de Laranja 500ml',
        descricao: 'Suco 100% natural, sem adição de açúcar.',
        preco: 9.5,
        estabelecimentoId: estabelecimento.id,
        categoriaId: bebidas.id,
      },
      {
        nome: 'Pudim de Leite Condensado',
        descricao: 'Fatia individual com calda de caramelo.',
        preco: 12.0,
        estabelecimentoId: estabelecimento.id,
        categoriaId: sobremesas.id,
      },
    ],
  });

  console.log('✅ Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante a execução do seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });