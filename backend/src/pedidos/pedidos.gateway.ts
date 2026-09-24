import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

const ORIGEM_CORS: string[] = process.env.CORS_ORIGIN?.split(',').map((o) =>
  o.trim(),
) ?? ['http://localhost:4200'];

/** Eventos emitidos quando um pedido muda, para atualizar o painel admin em tempo real */
export const EVENTO_PEDIDO_CRIADO = 'pedido.criado';
export const EVENTO_PEDIDO_ATUALIZADO = 'pedido.atualizado';
export const EVENTO_PEDIDO_REMOVIDO = 'pedido.removido';

// Cada estabelecimento tem seu próprio "room": só o painel admin do próprio
// tenant recebe os eventos dos seus pedidos (nada de broadcast global).
function roomDe(estabelecimentoId: string): string {
  return `estabelecimento:${estabelecimentoId}`;
}

@WebSocketGateway({
  cors: { origin: ORIGEM_CORS },
})
export class PedidosGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  // Só clientes autenticados entram, e sempre no room do SEU estabelecimento
  // (derivado do token — um admin não consegue escutar pedidos de outro tenant).
  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = this.jwtService.verify<{ estabelecimentoId?: string }>(
        token,
      );
      if (!payload.estabelecimentoId) {
        client.disconnect(true);
        return;
      }
      await client.join(roomDe(payload.estabelecimentoId));
    } catch {
      client.disconnect(true);
    }
  }

  emitirPedidoCriado(estabelecimentoId: string, pedido: unknown): void {
    this.server
      .to(roomDe(estabelecimentoId))
      .emit(EVENTO_PEDIDO_CRIADO, pedido);
  }

  emitirPedidoAtualizado(estabelecimentoId: string, pedido: unknown): void {
    this.server
      .to(roomDe(estabelecimentoId))
      .emit(EVENTO_PEDIDO_ATUALIZADO, pedido);
  }

  emitirPedidoRemovido(estabelecimentoId: string, id: string): void {
    this.server.to(roomDe(estabelecimentoId)).emit(EVENTO_PEDIDO_REMOVIDO, id);
  }
}
