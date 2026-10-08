import { ConflictException, NotFoundException } from '@nestjs/common';
import { unlinkSync } from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import { ProdutosService } from './produtos.service';

// O serviço apaga a imagem com `unlinkSync`; sobrescrevemos só essa função,
// mantendo o resto do `fs` real (o PrismaClient usa `existsSync` no boot).
jest.mock('fs', (): Record<string, unknown> => ({
  ...jest.requireActual('fs'),
  unlinkSync: jest.fn(),
}));

const unlinkSyncMock = unlinkSync as jest.Mock;

// `mock.calls` é tipado como `any[][]`; lemos o payload do `update` com tipo
// explícito para o lint não acusar acesso a valor `any`.
interface PayloadUpdate {
  data: {
    grupos?: {
      deleteMany?: unknown;
      create?: { nome: string }[];
    };
    ingredientes?: unknown;
    preco?: number;
  };
}

function payloadDoUpdate(mock: jest.Mock): PayloadUpdate['data'] {
  const chamada = mock.mock.calls[0] as [PayloadUpdate];
  return chamada[0].data;
}

interface GrupoFake {
  id: string;
  nome: string;
  ordem: number;
  maximoEscolhas: number;
  minimoEscolhas: number;
}

describe('ProdutosService', () => {
  let service: ProdutosService;

  let produtoFindUnique: jest.Mock;
  let produtoFindMany: jest.Mock;
  let produtoCreate: jest.Mock;
  let produtoUpdate: jest.Mock;
  let produtoDelete: jest.Mock;
  let categoriaFindUnique: jest.Mock;
  let ingredienteFindMany: jest.Mock;
  let produtoIngredienteUpdateMany: jest.Mock;

  // Produto existente usado nos testes de update/remove
  const PRODUTO_ATUAL = {
    id: 'prod-1',
    nome: 'Marmita',
    preco: 25,
    categoriaId: 'cat-1',
    estabelecimentoId: 'est-1',
    imagemUrl: null as string | null,
    tipo: 'MARMITA',
    grupos: [
      {
        id: 'g1',
        nome: 'Proteínas',
        ordem: 0,
        maximoEscolhas: 2,
        minimoEscolhas: 1,
      },
    ] satisfies GrupoFake[],
    ingredientes: [],
  };

  beforeEach(() => {
    produtoFindUnique = jest.fn();
    produtoFindMany = jest.fn().mockResolvedValue([]);
    produtoCreate = jest.fn();
    produtoUpdate = jest.fn();
    produtoDelete = jest.fn().mockResolvedValue({ id: 'prod-1' });
    categoriaFindUnique = jest
      .fn()
      .mockResolvedValue({ id: 'cat-1', estabelecimentoId: 'est-1' });
    ingredienteFindMany = jest.fn().mockResolvedValue([]);
    produtoIngredienteUpdateMany = jest.fn().mockResolvedValue({});
    unlinkSyncMock.mockReset().mockImplementation(() => undefined);

    // Por padrão o produto existe e pertence ao tenant certo
    produtoFindUnique.mockResolvedValue({ ...PRODUTO_ATUAL });

    const prisma = {
      produto: {
        findUnique: produtoFindUnique,
        findMany: produtoFindMany,
        create: produtoCreate,
        update: produtoUpdate,
        delete: produtoDelete,
      },
      categoria: { findUnique: categoriaFindUnique },
      ingrediente: { findMany: ingredienteFindMany },
      produtoIngrediente: { updateMany: produtoIngredienteUpdateMany },
    } as unknown as PrismaService;

    service = new ProdutosService(prisma);
  });

  describe('update — recriação de grupos', () => {
    // Regressão do C2: um PATCH parcial não pode destruir a config de marmita
    it('não apaga os grupos quando o patch manda só ingredientes', async () => {
      ingredienteFindMany.mockResolvedValue([{ id: 'ing-1' }]);
      // O `update` devolve o produto com os grupos que sobreviveram (nenhum
      // tocado): simulamos que continuam lá.
      produtoUpdate.mockResolvedValue({
        ...PRODUTO_ATUAL,
        grupos: PRODUTO_ATUAL.grupos,
      });

      await service.update('est-1', 'prod-1', {
        ingredientes: [{ ingredienteId: 'ing-1', precoAdicional: 2 }],
      });

      const data = payloadDoUpdate(produtoUpdate);
      // Não tocou em `grupos`: sem deleteMany, sem create
      expect(data.grupos).toBeUndefined();
      // `ingredientes` foi substituído normalmente
      expect(data.ingredientes).toBeDefined();
    });

    it('não apaga os grupos quando o patch manda só o preço', async () => {
      produtoUpdate.mockResolvedValue({ ...PRODUTO_ATUAL });

      await service.update('est-1', 'prod-1', { preco: 30 });

      const data = payloadDoUpdate(produtoUpdate);
      expect(data.grupos).toBeUndefined();
      expect(data.preco).toBe(30);
    });

    it('recria os grupos apenas quando `grupos` vem no payload', async () => {
      produtoUpdate.mockResolvedValue({
        ...PRODUTO_ATUAL,
        grupos: [
          {
            id: 'g-novo',
            nome: 'Acompanhamentos',
            ordem: 0,
            maximoEscolhas: 3,
            minimoEscolhas: 0,
          },
        ],
      });

      await service.update('est-1', 'prod-1', {
        grupos: [{ nome: 'Acompanhamentos', maximoEscolhas: 3 }],
      });

      const data = payloadDoUpdate(produtoUpdate);
      expect(data.grupos?.deleteMany).toEqual({});
      expect(data.grupos?.create).toHaveLength(1);
      expect(data.grupos?.create?.[0].nome).toBe('Acompanhamentos');
    });

    it('recria os grupos mesmo sem haver ingredientes no payload', async () => {
      // Antes do C2, PATCH só com `grupos` zerava tudo porque o `usados`
      // vinha vazio; agora o grupo informado sobrevive à normalização.
      produtoUpdate.mockResolvedValue({
        ...PRODUTO_ATUAL,
        grupos: [
          {
            id: 'g1',
            nome: 'Proteínas',
            ordem: 0,
            maximoEscolhas: 2,
            minimoEscolhas: 1,
          },
        ],
      });

      await service.update('est-1', 'prod-1', {
        grupos: [{ nome: 'Proteínas', maximoEscolhas: 2, minimoEscolhas: 1 }],
      });

      const data = payloadDoUpdate(produtoUpdate);
      expect(data.grupos?.create).toHaveLength(1);
      expect(data.grupos?.create?.[0].nome).toBe('Proteínas');
    });
  });

  describe('remove', () => {
    it('apaga a imagem do disco só depois do delete no banco', async () => {
      produtoFindUnique.mockResolvedValue({
        ...PRODUTO_ATUAL,
        imagemUrl: '/uploads/foto.png',
      });

      await service.remove('est-1', 'prod-1');

      expect(produtoDelete).toHaveBeenCalled();
      expect(unlinkSyncMock).toHaveBeenCalledWith(
        expect.stringContaining('foto.png'),
      );
    });

    it('converte FK RESTRICT (P2003) em 409 e preserva a imagem', async () => {
      produtoFindUnique.mockResolvedValue({
        ...PRODUTO_ATUAL,
        imagemUrl: '/uploads/foto.png',
      });
      produtoDelete.mockRejectedValue({ code: 'P2003' });

      await expect(service.remove('est-1', 'prod-1')).rejects.toThrow(
        ConflictException,
      );
      // A imagem NÃO foi tocada: o delete falhou, o arquivo continua válido
      expect(unlinkSyncMock).not.toHaveBeenCalled();
    });

    it('propaga erro inesperado sem apagar a imagem', async () => {
      produtoDelete.mockRejectedValue(new Error('boom'));

      await expect(service.remove('est-1', 'prod-1')).rejects.toThrow('boom');
      expect(unlinkSyncMock).not.toHaveBeenCalled();
    });

    it('não permite remover produto de outro estabelecimento', async () => {
      produtoFindUnique.mockResolvedValue({
        ...PRODUTO_ATUAL,
        estabelecimentoId: 'est-outro',
      });

      await expect(service.remove('est-1', 'prod-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(produtoDelete).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('lança 404 para produto inexistente', async () => {
      produtoFindUnique.mockResolvedValue(null);
      await expect(service.findOne('est-1', 'nope')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lança 404 para produto de outro tenant', async () => {
      produtoFindUnique.mockResolvedValue({
        ...PRODUTO_ATUAL,
        estabelecimentoId: 'est-outro',
      });
      await expect(service.findOne('est-1', 'prod-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
