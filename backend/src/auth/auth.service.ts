import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHmac } from 'crypto';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

const CUSTO_HASH_BCRYPT = 10;
/** Janela (15 min) usada para contar falhas de login por IP */
const JANELA_FALHAS_MS = 15 * 60 * 1000;
/** Número máximo de falhas por IP dentro da janela */
const MAX_FALHAS_POR_IP = 5;

const SEGREDO = process.env.JWT_SECRET ?? 'dev-change-this-secret';

export interface UsuarioPublico {
  id: string;
  nome: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // Cria um administrador (login será feito com o e-mail cadastrado)
  async registrar(
    nome: string,
    email: string,
    senha: string,
    confirmarSenha: string,
    ip: string,
  ): Promise<{ token: string; usuario: UsuarioPublico }> {
    if (senha !== confirmarSenha) {
      throw new BadRequestException('As senhas não conferem.');
    }

    // O login é por e-mail: normaliza para minúsculas e guarda sem espaços extras
    const emailNormalizado = email.trim().toLowerCase();

    const senhaHash = await hash(senha, CUSTO_HASH_BCRYPT);
    const usuario = await this.prisma.usuario
      .create({
        data: { nome, email: emailNormalizado, senhaHash },
        select: { id: true, nome: true, email: true },
      })
      .catch((erro: { code?: string }) => {
        if (erro?.code === 'P2002') {
          throw new ConflictException(
            'Já existe um administrador com este e-mail.',
          );
        }
        throw erro;
      });

    await this.registrarTentativa(ip, true);
    return this.emitirTokenAcesso(usuario);
  }

  async login(
    email: string,
    senha: string,
    ip: string,
  ): Promise<{ token: string; usuario: UsuarioPublico }> {
    const ipHash = this.hashIp(ip);

    // Proteção contra força bruta: limita falhas por IP na janela de tempo
    if (await this.ipBloqueado(ipHash)) {
      throw new HttpException(
        'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    const senhaConfere = usuario
      ? await compare(senha, usuario.senhaHash)
      : false;

    if (!usuario || !senhaConfere) {
      await this.registrarTentativa(ip, false);
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    // Sucesso: primeiro remove o histórico de falhas desse IP para "destravar"
    const desde = new Date(Date.now() - JANELA_FALHAS_MS);
    await this.prisma.tentativaLogin.deleteMany({
      where: { ipHash, sucesso: false, criadoEm: { gte: desde } },
    });
    await this.registrarTentativa(ip, true);

    return this.emitirTokenAcesso({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
    });
  }

  // Retorna os dados do usuário logado (usado para validar sessão)
  async me(id: string): Promise<UsuarioPublico> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: { id: true, nome: true, email: true },
    });
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    return usuario;
  }

  private emitirTokenAcesso(usuario: UsuarioPublico) {
    const token = this.jwtService.sign({
      sub: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
    });
    return { token, usuario };
  }

  private async ipBloqueado(ipHash: string): Promise<boolean> {
    const desde = new Date(Date.now() - JANELA_FALHAS_MS);
    const falhas = await this.prisma.tentativaLogin.count({
      where: {
        ipHash,
        sucesso: false,
        criadoEm: { gte: desde },
      },
    });
    return falhas >= MAX_FALHAS_POR_IP;
  }

  private async registrarTentativa(ip: string, sucesso: boolean): Promise<void> {
    await this.prisma.tentativaLogin.create({
      data: { ipHash: this.hashIp(ip), sucesso },
    });
  }

  // Nunca armazena o IP em texto puro: grava apenas o hash HMAC-SHA256
  private hashIp(ip: string): string {
    return createHmac('sha256', SEGREDO).update(ip).digest('hex');
  }
}

// Extrai o IP real do cliente (suporta uso atrás de proxy/reverse proxy)
export function obterIpCliente(req: Request): string {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (typeof xForwardedFor === 'string' && xForwardedFor.trim()) {
    return xForwardedFor.split(',')[0].trim();
  }
  return req.ip ?? req.socket?.remoteAddress ?? 'desconhecido';
}