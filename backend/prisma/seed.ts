import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Limpa registros anteriores para evitar duplicatas ao rodar novamente
  await prisma.itemPedido.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.categoria.deleteMany();

  console.log('🌱 Criando categorias...');

  const lanches = await prisma.categoria.create({
    data: {
      nome: 'Lanches',
    },
  });

  const bebidas = await prisma.categoria.create({
    data: {
      nome: 'Bebidas',
    },
  });

  const sobremesas = await prisma.categoria.create({
    data: {
      nome: 'Sobremesas',
    },
  });

  console.log('🍔 Criando produtos...');

  await prisma.produto.createMany({
    data: [
      {
        nome: 'X-Burguer Artesanal',
        descricao: 'Pão brioche, hambúrguer de 180g, queijo cheddar e molho especial.',
        preco: 28.9,
        categoriaId: lanches.id,
      },
      {
        nome: 'X-Salada Especial',
        descricao: 'Pão tradicional, hambúrguer de 150g, queijo, alface, tomate e maionese da casa.',
        preco: 24.5,
        categoriaId: lanches.id,
      },
      {
        nome: 'Refrigerante Lata 350ml',
        descricao: 'Coca-Cola, Guaraná Antarctica ou Sprite.',
        preco: 6.0,
        categoriaId: bebidas.id,
      },
      {
        nome: 'Suco Natural de Laranja 500ml',
        descricao: 'Suco 100% natural, sem adição de açúcar.',
        preco: 9.5,
        categoriaId: bebidas.id,
      },
      {
        nome: 'Pudim de Leite Condensado',
        descricao: 'Fatia individual com calda de caramelo.',
        preco: 12.0,
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