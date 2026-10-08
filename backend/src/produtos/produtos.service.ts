import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { unlinkSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProdutosService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeCompleto = {
    categoria: true,
    grupos: { orderBy: { ordem: 'asc' as const } },
    ingredientes: {
      include: {
        ingrediente: true,
        grupo: true,
      },
    },
  };

  // Nomes de grupo repetidos viram um só, e grupo sem nenhum ingrediente é
  // descartado para não gerar cabeçalho vazio no cardápio. O descarte só
  // faz sentido quando os ingredientes vêm junto (dá para saber o que tem
  // uso); num PATCH que manda só `grupos`, a lista enviada é honrada.
  private normalizarGrupos(
    grupos?: {
      nome: string;
      maximoEscolhas?: number;
      minimoEscolhas?: number;
    }[],
    ingredientes?: { grupo?: string }[],
    filtrarPorUso = true,
  ): { nome: string; maximoEscolhas: number; minimoEscolhas: number }[] {
    const usados = new Set(
      (ingredientes ?? [])
        .map((i) => i.grupo?.trim())
        .filter((n): n is string => Boolean(n)),
    );

    const porNome = new Map<
      string,
      { nome: string; maximoEscolhas: number; minimoEscolhas: number }
    >();
    for (const grupo of grupos ?? []) {
      const nome = grupo.nome?.trim();
      if (!nome) continue;
      if (filtrarPorUso && !usados.has(nome)) continue;
      const maximoEscolhas = Math.min(
        99,
        Math.max(1, Math.trunc(Number(grupo.maximoEscolhas ?? 99))),
      );
      // O piso nunca passa do teto: mínimo 3 em um grupo de teto 1 não fecha,
      // então o menor dos dois prevalece (a interface já impede o caso).
      const minimoEscolhas = Math.min(
        maximoEscolhas,
        Math.max(0, Math.trunc(Number(grupo.minimoEscolhas ?? 0))),
      );
      porNome.set(nome, { nome, maximoEscolhas, minimoEscolhas });
    }
    return [...porNome.values()];
  }

  // Liga cada ingrediente ao grupo pelo nome. Ingredientes cujo grupo não
  // exista no payload ficam soltos.
  private async vincularGrupos(
    produtoId: string,
    grupos: { id: string; nome: string }[],
    ingredientes: { ingredienteId: string; grupo?: string }[],
  ): Promise<void> {
    const porNome = new Map(grupos.map((g) => [g.nome, g.id]));

    for (const [nome, grupoId] of porNome) {
      const ids = ingredientes
        .filter((i) => i.grupo?.trim() === nome)
        .map((i) => i.ingredienteId);

      if (ids.length === 0) continue;

      await this.prisma.produtoIngrediente.updateMany({
        where: { produtoId, ingredienteId: { in: ids } },
        data: { grupoId },
      });
    }
  }

  // `@@unique([produtoId, ingredienteId])`: um id repetido no payload quebraria
  // o create/update com P2002 (500). Guarda a última ocorrência, mesmo
  // critério dos grupos normalizados acima.
  private deduplicarIngredientes(
    ingredientes?: {
      ingredienteId: string;
      precoAdicional?: number;
      grupo?: string;
    }[],
  ):
    | { ingredienteId: string; precoAdicional?: number; grupo?: string }[]
    | undefined {
    if (!ingredientes) return undefined;
    const porId = new Map(ingredientes.map((i) => [i.ingredienteId, i]));
    return [...porId.values()];
  }

  // Listar produtos (opcional filtrar por categoria e por visibilidade),
  // sempre dentro de um único estabelecimento
  async findAll(
    estabelecimentoId: string,
    categoriaId?: string,
    somenteVisiveis?: boolean,
  ) {
    return this.prisma.produto.findMany({
      where: {
        estabelecimentoId,
        ...(categoriaId ? { categoriaId } : {}),
        ...(somenteVisiveis ? { categoria: { visivel: true } } : {}),
      },
      include: this.includeCompleto,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Buscar um único produto por ID (sempre dentro do estabelecimento)
  async findOne(estabelecimentoId: string, id: string) {
    const produto = await this.prisma.produto.findUnique({
      where: { id },
      include: this.includeCompleto,
    });

    if (!produto || produto.estabelecimentoId !== estabelecimentoId) {
      throw new NotFoundException(`Produto com ID ${id} não encontrado.`);
    }

    return produto;
  }

  // Criar um novo produto
  async create(
    estabelecimentoId: string,
    data: {
      nome: string;
      descricao?: string;
      preco: number;
      imagemUrl?: string;
      categoriaId: string;
      tipo?: string;
      grupos?: {
        nome: string;
        maximoEscolhas?: number;
        minimoEscolhas?: number;
      }[];
      ingredientes?: {
        ingredienteId: string;
        precoAdicional?: number;
        grupo?: string;
      }[];
    },
  ) {
    const ingredientes = this.deduplicarIngredientes(data.ingredientes);

    await this.validarCategoria(estabelecimentoId, data.categoriaId);
    await this.validarIngredientes(estabelecimentoId, ingredientes);

    const grupos = this.normalizarGrupos(data.grupos, ingredientes);

    const criado = await this.prisma.produto.create({
      data: {
        nome: data.nome,
        descricao: data.descricao,
        preco: Number(data.preco),
        imagemUrl: data.imagemUrl,
        categoriaId: data.categoriaId,
        tipo: data.tipo ?? 'PADRAO',
        estabelecimentoId,
        grupos: grupos.length
          ? {
              create: grupos.map((g, indice) => ({
                nome: g.nome,
                maximoEscolhas: g.maximoEscolhas,
                minimoEscolhas: g.minimoEscolhas,
                ordem: indice,
              })),
            }
          : undefined,
        ingredientes: ingredientes
          ? {
              create: ingredientes.map((i) => ({
                ingredienteId: i.ingredienteId,
                precoAdicional: Number(i.precoAdicional ?? 0),
              })),
            }
          : undefined,
      },
      include: { grupos: true },
    });

    if (ingredientes?.length) {
      await this.vincularGrupos(criado.id, criado.grupos, ingredientes);
    }

    return this.findOne(estabelecimentoId, criado.id);
  }

  // Atualizar dados do produto
  async update(
    estabelecimentoId: string,
    id: string,
    data: {
      nome?: string;
      descricao?: string;
      preco?: number;
      imagemUrl?: string;
      categoriaId?: string;
      tipo?: string;
      grupos?: {
        nome: string;
        maximoEscolhas?: number;
        minimoEscolhas?: number;
      }[];
      ingredientes?: {
        ingredienteId: string;
        precoAdicional?: number;
        grupo?: string;
      }[];
    },
  ) {
    const atual = await this.findOne(estabelecimentoId, id);
    const ingredientes = this.deduplicarIngredientes(data.ingredientes);

    if (data.categoriaId) {
      await this.validarCategoria(estabelecimentoId, data.categoriaId);
    }
    await this.validarIngredientes(estabelecimentoId, ingredientes);

    // Se a imagem foi trocada, remove o arquivo antigo do disco
    if (data.imagemUrl !== undefined && data.imagemUrl !== atual.imagemUrl) {
      this.removerImagemDoDisco(atual.imagemUrl);
    }

    // Só recria os grupos quando o payload trouxe `grupos` de propósito.
    // Antes, `ingredientes !== undefined` também marcava a recriação, e
    // `normalizarGrupos(undefined, ...)` devolvia `[]` — o `deleteMany: {}`
    // apagava TODOS os grupos (teto/piso das marmitas) num PATCH parcial
    // que só mexia no preço ou nos ingredientes.
    const recriarGrupos = data.grupos !== undefined;
    const grupos = recriarGrupos
      ? this.normalizarGrupos(
          data.grupos,
          ingredientes,
          // Só filtra grupos "vazios" quando os ingredientes vêm junto;
          // PATCH só com `grupos` honra a lista enviada.
          ingredientes !== undefined,
        )
      : [];

    const atualizado = await this.prisma.produto.update({
      where: { id },
      data: {
        nome: data.nome,
        descricao: data.descricao,
        preco: data.preco !== undefined ? Number(data.preco) : undefined,
        imagemUrl: data.imagemUrl,
        categoriaId: data.categoriaId,
        tipo: data.tipo,
        grupos: recriarGrupos
          ? {
              deleteMany: {},
              create: grupos.map((g, indice) => ({
                nome: g.nome,
                maximoEscolhas: g.maximoEscolhas,
                minimoEscolhas: g.minimoEscolhas,
                ordem: indice,
              })),
            }
          : undefined,
        ingredientes: ingredientes
          ? {
              deleteMany: {},
              create: ingredientes.map((i) => ({
                ingredienteId: i.ingredienteId,
                precoAdicional: Number(i.precoAdicional ?? 0),
              })),
            }
          : undefined,
      },
      include: { grupos: true },
    });

    // Liga os ingredientes aos grupos pelo nome: usa os grupos recém-criados
    // quando veio `grupos` no payload, ou os já existentes quando só os
    // ingredientes mudaram (os nomes batem com o estado atual do produto).
    if (ingredientes?.length) {
      const gruposParaVinculo = recriarGrupos
        ? atualizado.grupos
        : atual.grupos;
      await this.vincularGrupos(id, gruposParaVinculo, ingredientes);
    }

    return this.findOne(estabelecimentoId, id);
  }

  // Remover um produto
  async remove(estabelecimentoId: string, id: string) {
    const produto = await this.findOne(estabelecimentoId, id);

    // Apaga primeiro no banco: `ItemPedido.produtoId` é ON DELETE RESTRICT,
    // então um produto que já aparece em algum pedido não pode ser excluído.
    // Se a imagem fosse removida antes, o delete falharia depois de já ter
    // apagado o arquivo, deixando `imagemUrl` apontando para um 404.
    const removido = await this.prisma.produto
      .delete({ where: { id } })
      .catch((erro) => this.tratarRestricao(erro, 'este produto'));

    this.removerImagemDoDisco(produto.imagemUrl);
    return removido;
  }

  // `P2003` = violação de chave estrangeira (RESTRICT). Vira 409 com mensagem
  // amigável em vez de 500 genérico pelo filtro global.
  private tratarRestricao(erro: unknown, oQue: string): never {
    const prismaErro = erro as { code?: string };
    if (prismaErro?.code === 'P2003') {
      throw new ConflictException(
        `Não é possível excluir ${oQue}: existem pedidos que o referenciam.`,
      );
    }
    throw erro;
  }

  // Impede vínculo com categoria de outro estabelecimento
  private async validarCategoria(
    estabelecimentoId: string,
    categoriaId: string,
  ): Promise<void> {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id: categoriaId },
      select: { estabelecimentoId: true },
    });
    if (!categoria || categoria.estabelecimentoId !== estabelecimentoId) {
      throw new NotFoundException(
        `Categoria com ID ${categoriaId} não encontrada.`,
      );
    }
  }

  // Impede vínculo com ingrediente de outro estabelecimento
  private async validarIngredientes(
    estabelecimentoId: string,
    ingredientes?: { ingredienteId: string; precoAdicional?: number }[],
  ): Promise<void> {
    if (!ingredientes || ingredientes.length === 0) return;
    const ids = [...new Set(ingredientes.map((i) => i.ingredienteId))];
    const encontrados = await this.prisma.ingrediente.findMany({
      where: {
        id: { in: ids },
        estabelecimentoId,
      },
      select: { id: true },
    });
    if (encontrados.length !== ids.length) {
      throw new NotFoundException(
        'Um ou mais ingredientes informados não pertencem ao estabelecimento.',
      );
    }
  }

  // Apaga do disco imagens locais (/uploads/...) que ficaram órfãs
  private removerImagemDoDisco(imagemUrl?: string | null): void {
    if (!imagemUrl || !imagemUrl.startsWith('/uploads/')) return;
    try {
      unlinkSync(join(process.cwd(), imagemUrl));
    } catch {
      // arquivo já pode ter sido removido pelo próprio usuário
    }
  }
}
