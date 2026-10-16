import { Prisma } from '@prisma/client';
import type { Socket } from 'socket.io';
import { EVENTO_PEDIDO_CRIADO, PedidosGateway } from './pedidos.gateway';

jest.mock('@nestjs/jwt', () => ({ JwtService: class {} }));

interface DadosTeste {
  usuarioId?: string;
  tokenVersao?: number;
  estabelecimentoId?: string;
  timerRevalidacao?: NodeJS.Timeout;
}

/**
 * O websocket tem duas frentes que não podem quebrar: autenticar quem entra no
 * room do PRÓPRIO estabelecimento (tirado do token, nunca do client) — inclusive
 * recusando token revogado — e emitir eventos já normalizados (Decimal ->
 * number), senão o painel soma errado.
 */
describe('PedidosGateway', () => {
  let jwtVerify: jest.Mock;
  let usuarioFindUnique: jest.Mock;
  let gateway: PedidosGateway;

  // Os mocks ficam fora do objeto do client para poder asserir neles sem
  // "soltar" um método da sua instância (o eslint marca `expect(socket.join)`
  // como unbound-method).
  function clienteCom(token: string | undefined): {
    client: Socket;
    disconnect: jest.Mock;
    join: jest.Mock;
    dados: DadosTeste;
  } {
    const disconnect = jest.fn();
    const join = jest.fn();
    const dados: DadosTeste = {};
    const client = {
      handshake: { auth: { token } },
      disconnect,
      join,
      data: dados,
      connected: true,
    } as unknown as Socket;
    return { client, disconnect, join, dados };
  }

  beforeEach(() => {
    // O gateway agenda a revalidação periódica; timers falsos evitam handles
    // abertos no fim dos testes.
    jest.useFakeTimers();
    jwtVerify = jest.fn();
    usuarioFindUnique = jest.fn().mockResolvedValue({
      tokenVersao: 0,
      estabelecimentoId: 'est-1',
    });
    gateway = new PedidosGateway(
      { verifyAsync: jwtVerify } as never,
      { usuario: { findUnique: usuarioFindUnique } } as never,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('derrota clientes sem token', async () => {
    const { client, disconnect } = clienteCom(undefined);
    await gateway.handleConnection(client);
    expect(disconnect).toHaveBeenCalledWith(true);
    expect(jwtVerify).not.toHaveBeenCalled();
  });

  it('derrota clientes com token inválido', async () => {
    jwtVerify.mockRejectedValue(new Error('token inválido'));
    const { client, disconnect } = clienteCom('token-ruim');
    await gateway.handleConnection(client);
    expect(disconnect).toHaveBeenCalledWith(true);
  });

  it('coloca o admin no room do estabelecimento tirado do token', async () => {
    jwtVerify.mockResolvedValue({
      sub: 'u1',
      estabelecimentoId: 'est-1',
      tv: 0,
    });
    const { client, disconnect, join } = clienteCom('token-bom');
    await gateway.handleConnection(client);
    expect(disconnect).not.toHaveBeenCalled();
    expect(join).toHaveBeenCalledWith('estabelecimento:est-1');
    gateway.handleDisconnect(client);
  });

  it('recusa token revogado (tokenVersao divergente do banco)', async () => {
    jwtVerify.mockResolvedValue({
      sub: 'u1',
      estabelecimentoId: 'est-1',
      tv: 0,
    });
    // Logout/troca de senha incrementam tokenVersao: o token emitido antes
    // (tv=0) não pode continuar escutando a room.
    usuarioFindUnique.mockResolvedValue({
      tokenVersao: 1,
      estabelecimentoId: 'est-1',
    });
    const { client, disconnect, join } = clienteCom('token-revogado');
    await gateway.handleConnection(client);
    expect(disconnect).toHaveBeenCalledWith(true);
    expect(join).not.toHaveBeenCalled();
  });

  it('recusa token de usuário que não existe mais', async () => {
    jwtVerify.mockResolvedValue({
      sub: 'u1',
      estabelecimentoId: 'est-1',
      tv: 0,
    });
    usuarioFindUnique.mockResolvedValue(null);
    const { client, disconnect, join } = clienteCom('token-orfao');
    await gateway.handleConnection(client);
    expect(disconnect).toHaveBeenCalledWith(true);
    expect(join).not.toHaveBeenCalled();
  });

  it('emite pedido criado normalizando Decimal para number', () => {
    const emit = jest.fn().mockReturnValue({});
    const server = { to: jest.fn().mockReturnValue({ emit }) };
    // `server` é private/readonly (é o Nest que injeta em runtime); no teste
    // definimos direto na instância para não brigar com o tipo.
    Object.defineProperty(gateway, 'server', { value: server });

    gateway.emitirPedidoCriado('est-1', {
      id: '1',
      total: new Prisma.Decimal('25.90'),
    });

    expect(server.to).toHaveBeenCalledWith('estabelecimento:est-1');
    expect(emit).toHaveBeenCalledWith(EVENTO_PEDIDO_CRIADO, {
      id: '1',
      total: 25.9,
    });
  });
});
