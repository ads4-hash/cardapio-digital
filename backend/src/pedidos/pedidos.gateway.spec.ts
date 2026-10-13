import { Prisma } from '@prisma/client';
import type { Socket } from 'socket.io';
import { EVENTO_PEDIDO_CRIADO, PedidosGateway } from './pedidos.gateway';

jest.mock('@nestjs/jwt', () => ({ JwtService: class {} }));

/**
 * O websocket tem duas frentes que não podem quebrar: autenticar quem entra no
 * room do PRÓPRIO estabelecimento (tirado do token, nunca do client) e emitir
 * eventos já normalizados (Decimal -> number), senão o painel soma errado.
 */
describe('PedidosGateway', () => {
  let jwtVerify: jest.Mock;
  let gateway: PedidosGateway;

  // Os mocks ficam fora do objeto do client para poder asserir neles sem
  // "soltar" um método da sua instância (o eslint marca `expect(socket.join)`
  // como unbound-method).
  function clienteCom(token: string | undefined): {
    client: Socket;
    disconnect: jest.Mock;
    join: jest.Mock;
  } {
    const disconnect = jest.fn();
    const join = jest.fn();
    const client = {
      handshake: { auth: { token } },
      disconnect,
      join,
    } as unknown as Socket;
    return { client, disconnect, join };
  }

  beforeEach(() => {
    jwtVerify = jest.fn();
    gateway = new PedidosGateway({ verify: jwtVerify } as never);
  });

  it('derrota clientes sem token', async () => {
    const { client, disconnect } = clienteCom(undefined);
    await gateway.handleConnection(client);
    expect(disconnect).toHaveBeenCalledWith(true);
    expect(jwtVerify).not.toHaveBeenCalled();
  });

  it('derrota clientes com token inválido', async () => {
    jwtVerify.mockImplementation(() => {
      throw new Error('token inválido');
    });
    const { client, disconnect } = clienteCom('token-ruim');
    await gateway.handleConnection(client);
    expect(disconnect).toHaveBeenCalledWith(true);
  });

  it('coloca o admin no room do estabelecimento tirado do token', async () => {
    jwtVerify.mockReturnValue({ estabelecimentoId: 'est-1' });
    const { client, disconnect, join } = clienteCom('token-bom');
    await gateway.handleConnection(client);
    expect(disconnect).not.toHaveBeenCalled();
    expect(join).toHaveBeenCalledWith('estabelecimento:est-1');
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
