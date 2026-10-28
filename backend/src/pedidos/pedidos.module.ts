import { Module } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { PedidosController } from './pedidos.controller';
import { PedidosGateway } from './pedidos.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { ComandasModule } from '../comandas/comandas.module';
import { MesasModule } from '../mesas/mesas.module';

@Module({
  imports: [PrismaModule, ComandasModule, MesasModule],
  controllers: [PedidosController],
  providers: [PedidosService, PedidosGateway],
})
export class PedidosModule {}
