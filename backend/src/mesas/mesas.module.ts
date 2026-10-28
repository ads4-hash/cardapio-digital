import { Module } from '@nestjs/common';
import { MesasService } from './mesas.service';
import { MesasController, MesasPublicasController } from './mesas.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [MesasService],
  controllers: [MesasController, MesasPublicasController],
  exports: [MesasService],
})
export class MesasModule {}
