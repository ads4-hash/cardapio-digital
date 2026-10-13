import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

interface PayloadJwt {
  sub?: string;
  nome?: string;
  email?: string;
  estabelecimentoId?: string;
  tv?: number;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extrairToken(request);

    if (!token) {
      throw new UnauthorizedException('Acesso não autorizado.');
    }

    let payload: PayloadJwt;
    try {
      payload = await this.jwtService.verifyAsync<PayloadJwt>(token);
    } catch {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }

    // Reconfere o usuário no banco a cada requisição: garante que a conta ainda
    // existe e que o token não foi revogado (tv = tokenVersao no momento em que
    // o token foi emitido). Sem isso, um token roubado viveria 15 min mesmo após
    // logout/troca de senha, e sobreviveria à exclusão do usuário.
    const usuario = payload.sub
      ? await this.prisma.usuario.findUnique({
          where: { id: payload.sub },
          select: {
            id: true,
            nome: true,
            email: true,
            estabelecimentoId: true,
            tokenVersao: true,
          },
        })
      : null;

    if (!usuario || usuario.tokenVersao !== (payload.tv ?? 0)) {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }

    request.user = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      estabelecimentoId: usuario.estabelecimentoId,
    };
    return true;
  }

  private extrairToken(request: Request): string | null {
    const [tipo, token] = request.headers.authorization?.split(' ') ?? [];
    return tipo === 'Bearer' && token ? token : null;
  }
}
