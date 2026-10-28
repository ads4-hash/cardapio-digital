import { Module } from '@nestjs/common';
import { ComandasService } from './comandas.service';
import { ComandasController } from './comandas.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ComandasService],
  controllers: [ComandasController],
  exports: [ComandasService],
})
export class ComandasModule {}
