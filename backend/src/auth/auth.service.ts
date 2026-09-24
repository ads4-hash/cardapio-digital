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
import { createHmac, randomBytes } from 'crypto';
import type { Request } from 'express';
import { EnvioEmailService } from '../envio-email/envio-email.service';
import { EstabelecimentosService } from '../estabelecimentos/estabelecimentos.service';
import { PrismaService } from '../prisma/prisma.service';
import { obterSegredo } from './segredo';
import { gerarSlug } from './slug';

const CUSTO_HASH_BCRYPT = 10;
/** Janela (15 min) usada para contar falhas de login por IP */
const JANELA_FALHAS_MS = 15 * 60 * 1000;
/** Número máximo de falhas por IP dentro da janela */
const MAX_FALHAS_POR_IP = 5;
/** Validade do token de recuperação de senha (30 min) */
const VALIDADE_RECUPERACAO_MS = 30 * 60 * 1000;
/** Não gera outro token enquanto existir um ativo recente (evita spam de e-mail) */
const REUSO_MINIMO_MS = 2 * 60 * 1000;
/** Alfabeto sem caracteres ambíguos (0/O/1/I) usado no código de recuperação */
const ALFABETO_CODIGO = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export interface EstabelecimentoDoUsuario {
  id: string;
  nome: string;
  slug: string;
  telefone: string | null;
}

export interface UsuarioPublico {
  id: string;
  nome: string;
  email: string;
  estabelecimento: EstabelecimentoDoUsuario;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly estabelecimentos: EstabelecimentosService,
    private readonly envioEmail: EnvioEmailService,
  ) {}

  // Cadastro público: cria o estabelecimento e o primeiro (único) administrador.
  // Cada estabelecimento tem seu próprio slug (URL /cardapio/:slug).
  async registrar(
    nomeEstabelecimento: string,
    nome: string,
    email: string,
    senha: string,
    confirmarSenha: string,
    telefone: string | null | undefined,
    ip: string,
  ): Promise<{ token: string; usuario: UsuarioPublico }> {
    if (senha !== confirmarSenha) {
      throw new BadRequestException('As senhas não conferem.');
    }

    // O login é por e-mail: normaliza para minúsculas e guarda sem espaços extras
    const emailNormalizado = email.trim().toLowerCase();
    const senhaHash = await hash(senha, CUSTO_HASH_BCRYPT);

    // Cria estabelecimento e usuário na mesma transação: se qualquer passo
    // falhar (ex.: e-mail duplicado) nada fica órfão no banco.
    const usuario = await this.prisma
      .$transaction(async (tx) => {
        const estabelecimento = await tx.estabelecimento.create({
          data: {
            nome: nomeEstabelecimento.trim(),
            slug: await this.gerarSlugUnico(nomeEstabelecimento),
            telefone: telefone?.trim() || null,
          },
        });

        return tx.usuario.create({
          data: {
            nome,
            email: emailNormalizado,
            senhaHash,
            estabelecimentoId: estabelecimento.id,
          },
          select: {
            id: true,
            nome: true,
            email: true,
            estabelecimento: {
              select: { id: true, nome: true, slug: true, telefone: true },
            },
          },
        });
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
      include: {
        estabelecimento: {
          select: { id: true, nome: true, slug: true, telefone: true },
        },
      },
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
      estabelecimento: {
        id: usuario.estabelecimento.id,
        nome: usuario.estabelecimento.nome,
        slug: usuario.estabelecimento.slug,
        telefone: usuario.estabelecimento.telefone,
      },
    });
  }

  // Dados públicos do estabelecimento (nome e contato) exibidos nas telas
  // públicas (cardápio e acompanhamento de pedido). Requer o slug da URL.
  async obterInfoCardapio(slug: string): Promise<{
    nome: string;
    telefone: string | null;
  }> {
    const estabelecimento = await this.estabelecimentos.porSlug(slug);
    return {
      nome: estabelecimento.nome,
      telefone: estabelecimento.telefone,
    };
  }

  // Inicia a recuperação de senha: gera um código de uso único (30 min),
  // envia por e-mail quando o SMTP está configurado ou devolve na resposta
  // (somente fora de produção) para exibição direta na tela de recuperação.
  // A resposta é sempre 200 e genérica para e-mails inexistentes, de modo que
  // a API não revele quais contas estão cadastradas (evita enumeração).
  async solicitarRecuperacao(email: string): Promise<{
    enviadoPorEmail: boolean;
    mensagem: string;
    token?: string;
    expiraEm?: string;
  }> {
    const emailNormalizado = email.trim().toLowerCase();
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: emailNormalizado },
      select: { id: true, email: true },
    });

    if (!usuario) {
      return {
        enviadoPorEmail: this.envioEmail.configurado(),
        mensagem:
          'Se o e-mail estiver cadastrado, você receberá as instruções para redefinir a senha.',
      };
    }

    // Não gera outro código enquanto houver um ativo recente (evita spam)
    const recente = await this.prisma.recuperacaoSenha.findFirst({
      where: {
        usuarioId: usuario.id,
        usadoEm: null,
        expiraEm: { gt: new Date() },
        criadoEm: { gte: new Date(Date.now() - REUSO_MINIMO_MS) },
      },
    });
    if (recente) {
      throw new HttpException(
        'Já enviamos um código recentemente. Aguarde alguns minutos antes de solicitar novamente.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const token = this.gerarCodigoRecuperacao();
    const expiraEm = new Date(Date.now() + VALIDADE_RECUPERACAO_MS);
    await this.criarCodigoRecuperacao(usuario.id, token, expiraEm);

    if (this.envioEmail.configurado()) {
      const frontendUrl =
        process.env.FRONTEND_URL?.trim().replace(/\/+$/, '') ??
        'http://localhost:4200';
      const link = `${frontendUrl}/recuperar-senha?token=${encodeURIComponent(token)}`;
      const enviado = await this.envioEmail.enviarEmail(
        usuario.email,
        'Recuperação de senha',
        `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">
            <h2>Recuperação de senha</h2>
            <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
            <p>Seu código de confirmação: <strong style="font-size:1.3rem;letter-spacing:2px">${token}</strong></p>
            <p>Para redefinir, acesse o link abaixo (válido por 30 minutos):</p>
            <p><a href="${link}" style="background:#22c55e;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Redefinir senha</a></p>
            <p style="color:#666;font-size:0.85rem">Se você não solicitou, ignore este e-mail.</p>
          </div>
        `,
      );
      if (enviado) {
        return {
          enviadoPorEmail: true,
          mensagem:
            'Enviamos um e-mail com o código de recuperação. Ele é válido por 30 minutos.',
        };
      }
      throw new HttpException(
        'Não foi possível enviar o e-mail de recuperação. Tente novamente mais tarde.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // Sem SMTP: o token só pode ser devolvido fora de produção
    if (process.env.NODE_ENV === 'production') {
      throw new HttpException(
        'O envio de e-mail não está configurado. Entre em contato com o suporte.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return {
      enviadoPorEmail: false,
      mensagem:
        'Modo local (sem SMTP): use o código abaixo para redefinir a senha.',
      token,
      expiraEm: expiraEm.toISOString(),
    };
  }

  private async criarCodigoRecuperacao(
    usuarioId: string,
    token: string,
    expiraEm: Date,
  ): Promise<void> {
    await this.prisma.$transaction([
      // Invalida códigos anteriores ainda ativos do mesmo usuário
      this.prisma.recuperacaoSenha.updateMany({
        where: { usuarioId, usadoEm: null },
        data: { usadoEm: new Date() },
      }),
      this.prisma.recuperacaoSenha.create({
        data: {
          usuarioId,
          tokenHash: this.hashRecuperacao(token),
          expiraEm,
        },
      }),
    ]);
  }

  // Redefine a senha usando o código de recuperação (único e com validade).
  // Todas as sessões ativas do usuário são mantidas, mas códigos anteriores
  // são invalidados para impedir reutilização.
  async redefinirSenha(
    token: string,
    novaSenha: string,
    confirmarSenha: string,
  ) {
    if (novaSenha !== confirmarSenha) {
      throw new BadRequestException('As senhas não conferem.');
    }

    const registro = await this.prisma.recuperacaoSenha.findFirst({
      where: {
        tokenHash: this.hashRecuperacao(token),
        usadoEm: null,
        expiraEm: { gt: new Date() },
      },
      orderBy: { criadoEm: 'desc' },
    });
    if (!registro) {
      throw new BadRequestException(
        'Código inválido ou expirado. Solicite um novo.',
      );
    }

    const senhaHash = await hash(novaSenha, CUSTO_HASH_BCRYPT);
    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: registro.usuarioId },
        data: { senhaHash },
      }),
      // Consome este código e invalida qualquer outro ainda ativo
      this.prisma.recuperacaoSenha.updateMany({
        where: { usuarioId: registro.usuarioId, usadoEm: null },
        data: { usadoEm: new Date() },
      }),
    ]);

    return {
      mensagem: 'Senha redefinida com sucesso. Faça login com a nova senha.',
    };
  }

  // Retorna os dados do usuário logado (usado para validar sessão)
  async me(id: string): Promise<UsuarioPublico> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      include: {
        estabelecimento: {
          select: { id: true, nome: true, slug: true, telefone: true },
        },
      },
    });
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      estabelecimento: {
        id: usuario.estabelecimento.id,
        nome: usuario.estabelecimento.nome,
        slug: usuario.estabelecimento.slug,
        telefone: usuario.estabelecimento.telefone,
      },
    };
  }

  // Edita os dados do usuário logado (nome, e-mail e, opcionalmente, senha).
  // O telefone pertence ao estabelecimento (exibido no pedido/WhatsApp).
  async atualizarPerfil(
    id: string,
    nome: string,
    email: string,
    senha?: string,
    confirmarSenha?: string,
    telefone?: string | null,
  ): Promise<UsuarioPublico> {
    if (senha) {
      if (senha !== confirmarSenha) {
        throw new BadRequestException('As senhas não conferem.');
      }
    }

    const emailNormalizado = email.trim().toLowerCase();
    const senhaHash = senha ? await hash(senha, CUSTO_HASH_BCRYPT) : undefined;
    const nomeEstabelecimento = nome.trim();

    const usuario = await this.prisma.usuario
      .update({
        where: { id },
        data: {
          nome: nomeEstabelecimento,
          email: emailNormalizado,
          ...(senhaHash ? { senhaHash } : {}),
        },
        include: {
          estabelecimento: {
            select: { id: true, nome: true, slug: true, telefone: true },
          },
        },
      })
      .catch((erro: { code?: string }) => {
        if (erro?.code === 'P2002') {
          throw new ConflictException(
            'Já existe um administrador com este e-mail.',
          );
        }
        throw erro;
      });

    // O nome exibido no painel é o do estabelecimento (idêntico ao do usuário);
    // ao renomear, atualiza o estabelecimento e regenera o slug da URL pública.
    const estabelecimentoAtual = await this.prisma.estabelecimento.findUnique({
      where: { id: usuario.estabelecimentoId },
      select: { nome: true },
    });
    if (
      estabelecimentoAtual &&
      estabelecimentoAtual.nome !== nomeEstabelecimento
    ) {
      const novoSlug = await this.gerarSlugUnico(
        nomeEstabelecimento,
        usuario.estabelecimentoId,
      );
      await this.prisma.estabelecimento.update({
        where: { id: usuario.estabelecimentoId },
        data: { nome: nomeEstabelecimento, slug: novoSlug },
      });
    }

    if (telefone !== undefined) {
      await this.prisma.estabelecimento.update({
        where: { id: usuario.estabelecimentoId },
        data: { telefone: telefone?.trim() || null },
      });
    }

    return this.me(id);
  }

  // Slug único: se o desejado já existir, acrescenta -2, -3, ... até achar livre
  // (excludeId ignora o próprio estabelecimento durante a validação)
  private async gerarSlugUnico(
    nomeEstabelecimento: string,
    excludeId?: string,
  ): Promise<string> {
    const base = gerarSlug(nomeEstabelecimento);
    let slug = base;
    let sufixo = 2;
    while (true) {
      const existente = await this.prisma.estabelecimento.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!existente || existente.id === excludeId) return slug;
      slug = `${base}-${sufixo}`;
      sufixo += 1;
    }
  }

  private emitirTokenAcesso(usuario: {
    id: string;
    nome: string;
    email: string;
    estabelecimento: EstabelecimentoDoUsuario;
  }) {
    const token = this.jwtService.sign({
      sub: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      estabelecimentoId: usuario.estabelecimento.id,
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

  private async registrarTentativa(
    ip: string,
    sucesso: boolean,
  ): Promise<void> {
    await this.prisma.tentativaLogin.create({
      data: { ipHash: this.hashIp(ip), sucesso },
    });
  }

  // Nunca armazena o IP em texto puro: grava apenas o hash HMAC-SHA256
  private hashIp(ip: string): string {
    return createHmac('sha256', obterSegredo()).update(ip).digest('hex');
  }

  // Código de recuperação curto (8 caracteres) manualmente digitável
  private gerarCodigoRecuperacao(): string {
    const bytes = randomBytes(8);
    let codigo = '';
    for (const byte of bytes) {
      codigo += ALFABETO_CODIGO[byte % ALFABETO_CODIGO.length];
    }
    return codigo;
  }

  // Armazena apenas o hash do código (nunca o valor em si)
  private hashRecuperacao(token: string): string {
    return createHmac('sha256', obterSegredo()).update(token).digest('hex');
  }
}

// Extrai o IP real do cliente.
// O cabeçalho X-Forwarded-For só é considerado quando a aplicação estiver atrás
// de um proxy/reverse proxy de confiança (CONFIAR_PROXY=true); caso contrário,
// confiar nele permitiria que o atacante forjasse o IP e contornasse o rate-limit.
export function obterIpCliente(req: Request): string {
  const confiaProxy = process.env.CONFIAR_PROXY === 'true';
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (
    confiaProxy &&
    typeof xForwardedFor === 'string' &&
    xForwardedFor.trim()
  ) {
    return xForwardedFor.split(',')[0].trim();
  }
  return req.ip ?? req.socket?.remoteAddress ?? 'desconhecido';
}
