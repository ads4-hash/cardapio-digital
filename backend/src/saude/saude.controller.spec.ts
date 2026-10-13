import { ServiceUnavailableException } from '@nestjs/common';
import { SaudeController } from './saude.controller';

/**
 * O healthcheck é o que o Docker (e o CI) usam para saber se o serviço está
 * realmente pronto — não basta o processo subir, o banco tem de responder.
 */
describe('SaudeController', () => {
  const prisma = { $queryRaw: jest.fn() };

  it('responde ok quando o banco responde', async () => {
    prisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);
    const controller = new SaudeController(prisma as never);
    await expect(controller.health()).resolves.toEqual({ status: 'ok' });
  });

  it('responde 503 quando o banco está fora', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('conexão perdida'));
    const controller = new SaudeController(prisma as never);
    await expect(controller.health()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
