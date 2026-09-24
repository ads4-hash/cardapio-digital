// Relatório administrativo por estabelecimento (tenant): contagens e amostras
// de usuários, categorias, produtos, ingredientes, vínculos, configurações,
// pedidos e itens. Rodar de dentro de backend/:
//   node scripts/relatorio-tenants.cjs
const path = require('path');

const caminhoBackend = path.resolve(__dirname, '..');
process.env.DATABASE_URL = `file:${path.join(caminhoBackend, 'prisma', 'dev.db').replace(/\\/g, '/')}`;
const { PrismaClient } = require(path.join(caminhoBackend, 'node_modules', '@prisma/client'));
const p = new PrismaClient();

function resumo(lista, campoTitulo) {
  return lista.length === 0
    ? '   (vazio)'
    : '\n' + lista.map((item) => `   - ${item[campoTitulo]}`).join('\n');
}

(async () => {
  const estabelecimentos = await p.estabelecimento.findMany({ orderBy: { nome: 'asc' } });
  const linhaSeparador = '='.repeat(72);

  for (const estab of estabelecimentos) {
    console.log(linhaSeparador);
    console.log(`ESTABELECIMENTO: ${estab.nome}`);
    console.log(`  id       : ${estab.id}`);
    console.log(`  slug     : ${estab.slug}`);
    console.log(`  telefone : ${estab.telefone ?? '(sem telefone)'}`);

    const usuarios = await p.usuario.findMany({ where: { estabelecimentoId: estab.id } });
    console.log(`\n[Usuario] (${usuarios.length})${resumo(usuarios, 'email')}`);

    const categorias = await p.categoria.findMany({ where: { estabelecimentoId: estab.id } });
    console.log(`\n[Categoria] (${categorias.length})${resumo(categorias, 'nome')}`);

    const produtos = await p.produto.findMany({ where: { estabelecimentoId: estab.id } });
    console.log(`\n[Produto] (${produtos.length})`);
    if (produtos.length) {
      for (const item of produtos) {
        console.log(`   - ${item.nome}  (R$ ${item.preco.toFixed(2).replace('.', ',')})`);
      }
    } else {
      console.log('   (vazio)');
    }

    const ingredientes = await p.ingrediente.findMany({ where: { estabelecimentoId: estab.id } });
    console.log(`\n[Ingrediente] (${ingredientes.length})${resumo(ingredientes, 'nome')}`);

    const vinculos = await p.produtoIngrediente.findMany({ where: { produto: { estabelecimentoId: estab.id } } });
    console.log(`\n[ProdutoIngrediente] (${vinculos.length} vínculos)`);

    const configs = await p.configuracao.findMany({ where: { estabelecimentoId: estab.id } });
    console.log(`\n[Configuracao] (${configs.length})`);
    if (configs.length) {
      for (const c of configs) {
        console.log(`   - ${c.chave} = ${c.valor}`);
      }
    } else {
      console.log('   (vazio)');
    }

    const pedidos = await p.pedido.findMany({ where: { estabelecimentoId: estab.id } });
    console.log(`\n[Pedido] (${pedidos.length})`);
    if (pedidos.length) {
      for (const item of pedidos) {
        console.log(`   - ${item.id.slice(0, 8).toUpperCase()} | ${item.cliente} | ${item.status} | R$ ${item.total.toFixed(2).replace('.', ',')}`);
      }
    } else {
      console.log('   (vazio)');
    }

    const itensPedidos = await p.itemPedido.findMany({ where: { pedido: { estabelecimentoId: estab.id } } });
    console.log(`\n[ItemPedido] (${itensPedidos.length} itens)`);
  }

  const tentativas = await p.tentativaLogin.count();
  console.log(linhaSeparador);
  console.log('TentativaLogin (controle de login, sem vínculo com usuário):', tentativas);
})().finally(() => p.$disconnect());