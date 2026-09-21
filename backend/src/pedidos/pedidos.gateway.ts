import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server } from 'socket.io';

const ORIGEM_CORS: string[] = process.env.CORS_ORIGIN?.split(',').map((o) =>
  o.trim(),
) ?? ['http://localhost:4200'];

/** Eventos emitidos quando um pedido muda, para atualizar o painel admin em tempo real */
export const EVENTO_PEDIDO_CRIADO = 'pedido.criado';
export const EVENTO_PEDIDO_ATUALIZADO = 'pedido.atualizado';
export const EVENTO_PEDIDO_REMOVIDO = 'pedido.removido';

@WebSocketGateway({
  cors: { origin: ORIGEM_CORS },
})
export class PedidosGateway {
  @WebSocketServer()
  private readonly server!: Server;

  emitirPedidoCriado(pedido: unknown): void {
    this.server.emit(EVENTO_PEDIDO_CRIADO, pedido);
  }

  emitirPedidoAtualizado(pedido: unknown): void {
    this.server.emit(EVENTO_PEDIDO_ATUALIZADO, pedido);
  }

  emitirPedidoRemovido(id: string): void {
    this.server.emit(EVENTO_PEDIDO_REMOVIDO, id);
  }
}
