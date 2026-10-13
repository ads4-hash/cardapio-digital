import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

// Healthcheck usado pelo Docker (e que serve de sonda de CI): responde rápido
// e confere o banco de dados de verdade, para "up" não significar só "o Node
// abriu a porta". Sem auth e sem escopo de tenant, de propósito.
@ApiTags('saúde')
@Controller('health')
export class SaudeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({
    summary: 'Healthcheck da aplicação',
    description: '200 quando a API e o banco respondem; 503 caso contrário.',
  })
  @ApiOkResponse({
    schema: { example: { status: 'ok' } },
  })
  @ApiServiceUnavailableResponse({
    description: 'Banco de dados indisponível.',
  })
  async health(): Promise<{ status: 'ok' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Banco de dados indisponível.');
    }
    return { status: 'ok' };
  }
}
