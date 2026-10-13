import { BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IngredientesService } from './ingredientes.service';

describe('IngredientesService', () => {
  let service: IngredientesService;
  let findMany: jest.Mock<
    Promise<Array<{ id: string; nome: string }>>,
    [{ where: { estabelecimentoId: string } }]
  >;
  let create: jest.Mock<
    Promise<unknown>,
    [{ data: { nome: string; estabelecimentoId: string } }]
  >;
  let update: jest.Mock<
    Promise<unknown>,
    [{ where: { id: string }; data: { nome?: string } }]
  >;
  let findUnique: jest.Mock<Promise<unknown>, [{ where: { id: string } }]>;

  beforeEach(() => {
    findMany = jest
      .fn<
        Promise<Array<{ id: string; nome: string }>>,
        [{ where: { estabelecimentoId: string } }]
      >()
      .mockResolvedValue([
        { id: 'ing-1', nome: 'Bacon' },
        { id: 'ing-2', nome: 'Queijo' },
      ]);
    create = jest
      .fn<
        Promise<unknown>,
        [{ data: { nome: string; estabelecimentoId: string } }]
      >()
      .mockResolvedValue({ id: 'novo' });
    update = jest
      .fn<
        Promise<unknown>,
        [{ where: { id: string }; data: { nome?: string } }]
      >()
      .mockResolvedValue({ id: 'ing-3' });
    findUnique = jest
      .fn<Promise<unknown>, [{ where: { id: string } }]>()
      .mockResolvedValue({
        id: 'ing-3',
        nome: 'Azeitona',
        estabelecimentoId: 'est-1',
        produtos: [],
      });

    const prisma = {
      ingrediente: { findMany, create, update, findUnique },
    } as unknown as PrismaService;

    service = new IngredientesService(prisma);
  });

  describe('create', () => {
    it('cria com o nome sem espaços das pontas', async () => {
      await service.create('est-1', { nome: '  Tomate  ' });
      expect(create).toHaveBeenCalledWith({
        data: { nome: 'Tomate', estabelecimentoId: 'est-1' },
      });
    });

    it('recusa nome repetido ignorando caixa e acentos', async () => {
      await expect(service.create('est-1', { nome: 'bacon' })).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create('est-1', { nome: 'QUÉIJO' })).rejects.toThrow(
        ConflictException,
      );
      expect(create).not.toHaveBeenCalled();
    });

    it('recusa nome vazio após remover espaços', async () => {
      await expect(service.create('est-1', { nome: '   ' })).rejects.toThrow(
        BadRequestException,
      );
      expect(findMany).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('permite manter o próprio nome', async () => {
      await service.update('est-1', 'ing-2', { nome: 'Queijo' });
      expect(update).toHaveBeenCalledWith({
        where: { id: 'ing-2' },
        data: { nome: 'Queijo' },
      });
    });

    it('recusa renomear para um nome já existente', async () => {
      await expect(
        service.update('est-1', 'ing-3', { nome: 'bacon' }),
      ).rejects.toThrow(ConflictException);
      expect(update).not.toHaveBeenCalled();
    });

    it('não valida nome quando ele não é enviado', async () => {
      await service.update('est-1', 'ing-3', {});
      expect(findMany).not.toHaveBeenCalled();
      expect(update).toHaveBeenCalledWith({ where: { id: 'ing-3' }, data: {} });
    });
  });
});
