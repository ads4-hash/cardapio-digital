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

  async porSlug(slug: string): Promise<EstabelecimentoPublico> {
    if (!slug || !slug.trim()) {
      throw new BadRequestException('Slug do estabelecimento é obrigatório.');
    }
    const estabelecimento = await this.prisma.estabelecimento.findUnique({
      where: { slug },
      select: { id: true, nome: true, slug: true, telefone: true },
    });
    if (!estabelecimento) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }
    return estabelecimento;
  }
}
