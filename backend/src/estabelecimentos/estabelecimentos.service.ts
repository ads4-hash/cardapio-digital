import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface EstabelecimentoPublico {
  id: string;
  nome: string;
  slug: string;
  telefone: string | null;
}

/**
 * Resolução dos estabelecimentos (tenants) do sistema. O slug é a chave pública
 * usada nas URLs /cardapio/:slug e em todas as consultas públicas por tenant.
 */
@Injectable()
export class EstabelecimentosService {
  constructor(private readonly prisma: PrismaService) {}

  // O `slug` vem de `@Query`, que devolve array quando o parâmetro repete na
  // URL (`?slug=a&slug=b`) e string quando vem único. Sem este filtro,
  // `slug.trim` estourava com 500 para o array; agora os dois casos viram o
  // mesmo caminho normalizado.
  async porSlug(slug: string | string[]): Promise<EstabelecimentoPublico> {
    const normalizado = (Array.isArray(slug) ? slug[0] : slug)?.trim();
    if (!normalizado) {
      throw new BadRequestException('Slug do estabelecimento é obrigatório.');
    }
    const estabelecimento = await this.prisma.estabelecimento.findUnique({
      where: { slug: normalizado },
      select: { id: true, nome: true, slug: true, telefone: true },
    });
    if (!estabelecimento) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }
    return estabelecimento;
  }
}
