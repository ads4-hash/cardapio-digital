import type { Request } from 'express';
// Import só de tipo: não carrega o módulo ESM em tempo de execução.
import type { JwtService } from '@nestjs/jwt';
import { CategoriasController } from './categorias.controller';
import { CategoriasService } from './categorias.service';
import { EstabelecimentosService } from '../estabelecimentos/estabelecimentos.service';

// @nestjs/jwt é ESM e o Jest (CJS) não o transforma; o controller só usa o
// serviço injetado, então carregamos um stub no lugar do módulo real.
jest.mock('@nestjs/jwt', () => ({ JwtService: class {} }));

/**
 * O GET /categorias é público e precisa esconder as categorias ocultas
 * (`visivel=false`) de quem não é o admin do MESMO estabelecimento — mesmo
 * critério do GET /produtos. Aqui ficam as quatro combinações de token.
 */
describe('CategoriasController — filtro de visibilidade', () => {
  let controller: CategoriasController;
  let findAll: jest.Mock;
  let porSlug: jest.Mock;
  let verifyAsync: jest.Mock;

  beforeEach(() => {
    findAll = jest.fn().mockResolvedValue([]);
    porSlug = jest.fn().mockResolvedValue({
      id: 'est-1',
      nome: 'Pizzaria',
      slug: 'pizzaria',
      telefone: null,
    });
    verifyAsync = jest.fn();

    controller = new CategoriasController(
      { findAll } as unknown as CategoriasService,
      { porSlug } as unknown as EstabelecimentosService,
      { verifyAsync } as unknown as JwtService,
    );
  });

  function requisicao(authorization?: string): Request {
    return {
      headers: authorization ? { authorization } : {},
    } as Request;
  }

  it('sem token: lista só as visíveis (cardápio público)', async () => {
    await controller.findAll('pizzaria', requisicao());

    expect(findAll).toHaveBeenCalledWith('est-1', true);
  });

  it('token do próprio estabelecimento: lista tudo (painel)', async () => {
    verifyAsync.mockResolvedValue({ estabelecimentoId: 'est-1' });

    await controller.findAll('pizzaria', requisicao('Bearer token-valido'));

    expect(findAll).toHaveBeenCalledWith('est-1', undefined);
  });

  it('token de OUTRO estabelecimento: continua filtrado', async () => {
    verifyAsync.mockResolvedValue({ estabelecimentoId: 'est-intruso' });

    await controller.findAll('pizzaria', requisicao('Bearer token-de-outrem'));

    expect(findAll).toHaveBeenCalledWith('est-1', true);
  });

  it('token inválido: continua filtrado', async () => {
    verifyAsync.mockRejectedValue(new Error('jwt expirado'));

    await controller.findAll('pizzaria', requisicao('Bearer vencido'));

    expect(findAll).toHaveBeenCalledWith('est-1', true);
  });
});
