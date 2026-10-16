import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { decimaisParaNumero } from '../common/decimais';
import { origensCors } from '../cors';
import { PrismaService } from '../prisma/prisma.service';

/** Eventos emitidos quando um pedido muda, para atualizar o painel admin em tempo real */
export const EVENTO_PEDIDO_CRIADO = 'pedido.criado';
export const EVENTO_PEDIDO_ATUALIZADO = 'pedido.atualizado';
export const EVENTO_PEDIDO_REMOVIDO = 'pedido.removido';

// O handshake sozinho não basta: sem revalidação periódica, um token roubado
// ou revogado (logout, troca de senha, redefinição) continuaria na room até o
// servidor reiniciar, recebendo eventos com PII de clientes.
const INTERVALO_REVALIDACAO_MS = 30_000;

interface PayloadJwt {
  sub?: string;
  estabelecimentoId?: string;
  tv?: number;
}

// `Socket.data` é `any` por padrão; tipar evita `no-unsafe-member-access`.
interface DadosSocket {
  usuarioId?: string;
  tokenVersao?: number;
  estabelecimentoId?: string;
  timerRevalidacao?: NodeJS.Timeout;
}

// Cada estabelecimento tem seu próprio "room": só o painel admin do próprio
// tenant recebe os eventos dos seus pedidos (nada de broadcast global).
function roomDe(estabelecimentoId: string): string {
  return `estabelecimento:${estabelecimentoId}`;
}

@WebSocketGateway({
  cors: { origin: origensCors() },
})
export class PedidosGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  // Só clientes autenticados entram, e sempre no room do SEU estabelecimento
  // (derivado do token — um admin não consegue escutar pedidos de outro tenant).
  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect(true);
      return;
    }

    let payload: PayloadJwt;
    try {
      payload = await this.jwtService.verifyAsync<PayloadJwt>(token);
    } catch {
      client.disconnect(true);
      return;
    }

    // Mesma checagem do AuthGuard: conta ainda existe e tokenVersao bate.
    const usuario = payload.sub
      ? await this.prisma.usuario.findUnique({
          where: { id: payload.sub },
          select: { tokenVersao: true, estabelecimentoId: true },
        })
      : null;

    if (
      !usuario ||
      usuario.tokenVersao !== (payload.tv ?? 0) ||
      usuario.estabelecimentoId !== payload.estabelecimentoId
    ) {
      client.disconnect(true);
      return;
    }

    const dados = client.data as DadosSocket;
    dados.usuarioId = payload.sub;
    dados.tokenVersao = payload.tv ?? 0;
    dados.estabelecimentoId = usuario.estabelecimentoId;

    await client.join(roomDe(usuario.estabelecimentoId));

    dados.timerRevalidacao = setInterval(() => {
      void this.revalidar(client);
    }, INTERVALO_REVALIDACAO_MS);
  }

  handleDisconnect(client: Socket): void {
    const dados = client.data as DadosSocket;
    if (dados.timerRevalidacao) clearInterval(dados.timerRevalidacao);
    dados.timerRevalidacao = undefined;
  }

  // Confere periodicamente se a sessão continua válida. Falha de banco não
  // derruba o admin: a próxima batida (ou o próprio evento HTTP) decide.
  private async revalidar(client: Socket): Promise<void> {
    if (!client.connected) return;

    const { usuarioId, tokenVersao } = client.data as DadosSocket;
    if (!usuarioId) {
      client.disconnect(true);
      return;
    }

    try {
      const usuario = await this.prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: { tokenVersao: true, estabelecimentoId: true },
      });

      if (!usuario || usuario.tokenVersao !== tokenVersao) {
        client.disconnect(true);
      }
    } catch {
      // Mantém a conexão: indisponibilidade temporária do banco não é
      // revogação. O AuthGuard barra qualquer ação HTTP nesse meio-tempo.
    }
  }

  emitirPedidoCriado(estabelecimentoId: string, pedido: unknown): void {
    this.server
      .to(roomDe(estabelecimentoId))
      // Mesma normalização do HTTP: sem ela o socket ia mandar preco/total
      // como string ("25.9") e o painel somaria errado.
      .emit(EVENTO_PEDIDO_CRIADO, decimaisParaNumero(pedido));
  }

  emitirPedidoAtualizado(estabelecimentoId: string, pedido: unknown): void {
    this.server
      .to(roomDe(estabelecimentoId))
      .emit(EVENTO_PEDIDO_ATUALIZADO, decimaisParaNumero(pedido));
  }

  emitirPedidoRemovido(estabelecimentoId: string, id: string): void {
    this.server.to(roomDe(estabelecimentoId)).emit(EVENTO_PEDIDO_REMOVIDO, id);
  }
}
