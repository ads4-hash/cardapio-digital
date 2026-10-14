import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  // Fecha as conexões ao receber SIGTERM/SIGINT (ex.: restart do container),
  // evitando que o processo morra no meio de uma escrita no SQLite e deixe o
  // arquivo/WAL em estado inconsistente.
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
