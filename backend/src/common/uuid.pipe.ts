import { BadRequestException, ParseUUIDPipe } from '@nestjs/common';

/**
 * Valida que um parâmetro de rota é um UUID (`@default(uuid())` em todas as
 * entidades). Usado nos `@Param('id')` para rejeitar lixo cedo, em vez de
 * deixar a query do Prisma estourar.
 */
export const ParseIdUuidPipe = new ParseUUIDPipe({
  version: '4',
  exceptionFactory: () => new BadRequestException('Identificador inválido.'),
});
