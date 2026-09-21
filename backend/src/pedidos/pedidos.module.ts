import { Module } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { PedidosController } from './pedidos.controller';
import { PedidosGateway } from './pedidos.gateway';
import { ConfiguracoesModule } from '../configuracoes/configuracoes.module';

@Module({
  imports: [ConfiguracoesModule],
  controllers: [PedidosController],
  providers: [PedidosService, PedidosGateway],
})
export class PedidosModule {}
