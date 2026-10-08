import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstabelecimentosService } from './estabelecimentos.service';

describe('EstabelecimentosService.porSlug', () => {
  let service: EstabelecimentosService;
  let findUnique: jest.Mock<Promise<unknown>, [{ where: { slug: string } }]>;

  beforeEach(() => {
    findUnique = jest
      .fn<Promise<unknown>, [{ where: { slug: string } }]>()
      .mockResolvedValue({
        id: 'est-1',
        nome: 'Pizzaria do Zé',
        slug: 'pizzaria-do-ze',
        telefone: null,
      });
    const prisma = {
      estabelecimento: { findUnique },
    } as unknown as PrismaService;

    service = new EstabelecimentosService(prisma);
  });

  it('devolve o estabelecimento do slug', async () => {
    await expect(service.porSlug('pizzaria-do-ze')).resolves.toMatchObject({
      id: 'est-1',
      slug: 'pizzaria-do-ze',
    });
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: 'pizzaria-do-ze' } }),
    );
  });

  it('remove espaços das pontas antes de consultar', async () => {
    await service.porSlug('  pizzaria-do-ze  ');
    expect(findUnique.mock.calls[0][0].where.slug).toBe('pizzaria-do-ze');
  });

  // `@Query` devolve array quando o parâmetro repete na URL
  // (?slug=a&slug=b). Antes, `slug.trim` estourava com 500; agora usa o 1º.
  it('usa o primeiro valor quando o parâmetro chega como array', async () => {
    await service.porSlug(['pizzaria-do-ze', 'outra-casa']);
    expect(findUnique.mock.calls[0][0].where.slug).toBe('pizzaria-do-ze');
  });

  it('recusa slug vazio com 400', async () => {
    await expect(service.porSlug('   ')).rejects.toThrow(BadRequestException);
    await expect(service.porSlug('')).rejects.toThrow(BadRequestException);
    await expect(service.porSlug([])).rejects.toThrow(BadRequestException);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('devolve 404 quando o slug não existe', async () => {
    findUnique.mockResolvedValue(null);
    await expect(service.porSlug('nao-existe')).rejects.toThrow(
      NotFoundException,
    );
  });
});
