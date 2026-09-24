import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

interface PayloadJwt {
  sub?: string;
  nome?: string;
  email?: string;
  estabelecimentoId?: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extrairToken(request);

    if (!token) {
      throw new UnauthorizedException('Acesso não autorizado.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<PayloadJwt>(token);
      request.user = {
        id: payload.sub ?? '',
        nome: payload.nome ?? '',
        email: payload.email ?? '',
        estabelecimentoId: payload.estabelecimentoId ?? '',
      };
      return true;
    } catch {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }
  }

  private extrairToken(request: Request): string | null {
    const [tipo, token] = request.headers.authorization?.split(' ') ?? [];
    return tipo === 'Bearer' && token ? token : null;
  }
}
