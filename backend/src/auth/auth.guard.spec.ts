import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

jest.mock('@nestjs/jwt', () => ({ JwtService: class {} }));

/**
 * O guard passou a bater no banco a cada requisição (revogação por
 * tokenVersao, exclusão da conta). Esses testes fecham o contrato disso
 * sem depender de um servidor HTTP.
 */
describe('AuthGuard', () => {
  let jwtVerifyAsync: jest.Mock;
  let usuarioFindUnique: jest.Mock;
  let guard: AuthGuard;

  function contextoCom(token: string | null): ExecutionContext {
    const request: { headers: Record<string, string>; user?: unknown } = {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }

  function construir(payload: unknown, usuario: unknown) {
    jwtVerifyAsync = jest.fn().mockResolvedValue(payload);
    usuarioFindUnique = jest.fn().mockResolvedValue(usuario);
    guard = new AuthGuard(
      { verifyAsync: jwtVerifyAsync } as never,
      { usuario: { findUnique: usuarioFindUnique } } as never,
    );
  }

  it('rejeita pedido sem token antes de consultar o banco', async () => {
    construir({}, {});
    await expect(guard.canActivate(contextoCom(null))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(usuarioFindUnique).not.toHaveBeenCalled();
  });

  it('rejeita token inválido ou expirado', async () => {
    jwtVerifyAsync = jest.fn().mockRejectedValue(new Error('expirado'));
    usuarioFindUnique = jest.fn();
    guard = new AuthGuard(
      { verifyAsync: jwtVerifyAsync } as never,
      { usuario: { findUnique: usuarioFindUnique } } as never,
    );
    await expect(
      guard.canActivate(contextoCom('token-ruim')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(usuarioFindUnique).not.toHaveBeenCalled();
  });

  it('aceita token válido na versão atual e popula o request.user', async () => {
    construir(
      { sub: 'usr-1', nome: 'Dona', email: 'dona@email.com', tv: 0 },
      {
        id: 'usr-1',
        nome: 'Dona',
        email: 'dona@email.com',
        estabelecimentoId: 'est-1',
        tokenVersao: 0,
      },
    );
    const context = contextoCom('token-bom');
    await expect(guard.canActivate(context)).resolves.toBe(true);

    const request = context.switchToHttp().getRequest<{
      user: { id: string; estabelecimentoId?: string };
    }>();
    expect(request.user.id).toBe('usr-1');
    expect(request.user.estabelecimentoId).toBe('est-1');
  });

  it('rejeita token de sessão revogada (tv desatualizado)', async () => {
    construir(
      { sub: 'usr-1', tv: 0 },
      { id: 'usr-1', tokenVersao: 1, estabelecimentoId: 'est-1' },
    );
    await expect(
      guard.canActivate(contextoCom('token-velho')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejeita token de usuário que não existe mais', async () => {
    construir({ sub: 'usr-removido', tv: 0 }, null);
    await expect(
      guard.canActivate(contextoCom('token-orfao')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
