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
import type { Prisma } from '@prisma/client';
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
/**
 * Número máximo de falhas por e-mail dentro da janela. Maior que o do IP de
 * propósito: o limite por IP protege contra "spray" (uma tentativa contra
 * várias contas), e o por e-mail protege a conta contra credential stuffing
 * distribuído, em que o atacante rotaciona o IP. Os dois cobrem ataques
 * diferentes e ficam calibrados assim para não inocentar o usuário legítimo
 * logo no primeiro erro de digitação.
 */
const MAX_FALHAS_POR_EMAIL = 10;
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
        // O cadastro é só do bootstrap: o primeiro usuário vira o
        // administrador e, depois dele, o endpoint responde 409 (como
        // documentado no README e no Swagger). A conferência roda dentro da
        // transação para encurtar a janela de dois cadastros simultâneos
        // passarem juntos.
        const jaExiste = await tx.usuario.findFirst({ select: { id: true } });
        if (jaExiste) {
          throw new ConflictException(
            'O cadastro de administradores está encerrado. Entre em contato com o suporte para obter um acesso.',
          );
        }

        const estabelecimento = await tx.estabelecimento.create({
          data: {
            nome: nomeEstabelecimento.trim(),
            slug: await this.gerarSlugUnico(nomeEstabelecimento, undefined, tx),
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
      .catch((erro) => this.tratarP2002(erro));

    await this.registrarTentativa(ip, this.hashEmail(emailNormalizado), true);
    return this.emitirTokenAcesso(usuario);
  }

  async login(
    email: string,
    senha: string,
    ip: string,
  ): Promise<{ token: string; usuario: UsuarioPublico }> {
    const ipHash = this.hashIp(ip);
    // Haspa o e-mail ANTES de consultar o usuário, e registra a tentativa mesmo
    // quando a conta não existe. Assim a contagem é idêntica para e-mails
    // cadastrados e inexistentes, e a resposta não revela quais contas existem.
    const emailHash = this.hashEmail(email);

    // Proteção contra força bruta em duas camadas: por IP (contra "spray" em
    // várias contas) e por e-mail (contra credential stuffing distribuído).
    if (
      (await this.ipBloqueado(ipHash)) ||
      (await this.emailBloqueado(emailHash))
    ) {
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
    // O `compare` roda SEMPRE, mesmo quando a conta não existe (hash fictício
    // de custo idêntico): sem isto, um e-mail não cadastrado respondia mais
    // rápido e permitia descobrir quais contas existem pelo tempo da resposta.
    const hashDeReferencia = usuario?.senhaHash ?? (await this.hashFicticio());
    const senhaConfere = await compare(senha, hashDeReferencia);

    if (!usuario || !senhaConfere) {
      await this.registrarTentativa(ip, emailHash, false);
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    // Sucesso: limpa o histórico de falhas deste IP e deste e-mail para
    // "destravar" as duas camadas
    const desde = new Date(Date.now() - JANELA_FALHAS_MS);
    await this.prisma.tentativaLogin.deleteMany({
      where: { ipHash, sucesso: false, criadoEm: { gte: desde } },
    });
    await this.prisma.tentativaLogin.deleteMany({
      where: { emailHash, sucesso: false, criadoEm: { gte: desde } },
    });
    await this.registrarTentativa(ip, emailHash, true);
    // Fora do caminho crítico: só evita que as tabelas cresçam sem limite
    void this.limparRegistrosAntigos().catch(() => undefined);

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
  //
  // Trocar e-mail ou senha exige `senhaAtual`: sem isso, quem tivesse um token
  // roubado trocaria o e-mail e a senha num único PATCH e tomaria a conta.
  async atualizarPerfil(
    id: string,
    nome: string,
    email: string,
    senha?: string,
    confirmarSenha?: string,
    telefone?: string | null,
    senhaAtual?: string,
  ): Promise<UsuarioPublico> {
    if (senha) {
      if (senha !== confirmarSenha) {
        throw new BadRequestException('As senhas não conferem.');
      }
    }

    const emailNormalizado = email.trim().toLowerCase();
    const nomeEstabelecimento = nome.trim();

    // Precisa do hash atual para conferir `senhaAtual` antes de qualquer escrita.
    const atual = await this.prisma.usuario.findUnique({
      where: { id },
      select: { email: true, senhaHash: true },
    });
    if (!atual) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    // Só exige reautenticação quando o e-mail realmente muda — o formulário
    // sempre reenvia o e-mail, então comparar sem isso quebraria a edição de nome.
    const trocaCredencial =
      Boolean(senha) || emailNormalizado !== atual.email.trim().toLowerCase();

    if (trocaCredencial || senhaAtual) {
      if (!senhaAtual) {
        throw new BadRequestException(
          'Informe a senha atual para alterar o e-mail ou a senha.',
        );
      }
      // 400 e não 401: o token está válido, quem falhou foi o campo do corpo.
      // Um 401 aqui deslogaria o admin no interceptor do frontend.
      if (!(await compare(senhaAtual, atual.senhaHash))) {
        throw new BadRequestException('Senha atual incorreta.');
      }
    }

    const senhaHash = senha ? await hash(senha, CUSTO_HASH_BCRYPT) : undefined;

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
      .catch((erro) => this.tratarP2002(erro));

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
      await this.prisma.estabelecimento
        .update({
          where: { id: usuario.estabelecimentoId },
          data: { nome: nomeEstabelecimento, slug: novoSlug },
        })
        .catch((erro) => this.tratarP2002(erro));
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
  // O cliente (`db`) pode ser o da transação em andamento, para que a
  // verificação de unicidade veja o mesmo snapshot da escrita seguinte.
  private async gerarSlugUnico(
    nomeEstabelecimento: string,
    excludeId?: string,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<string> {
    const base = gerarSlug(nomeEstabelecimento);
    let slug = base;
    let sufixo = 2;
    while (true) {
      const existente = await db.estabelecimento.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!existente || existente.id === excludeId) return slug;
      slug = `${base}-${sufixo}`;
      sufixo += 1;
    }
  }

  // P2002 = violação de constraint única. O `meta.target` diz qual constraint
  // estourou (slug ou email), então a mensagem é montada por destino — antes,
  // qualquer colisão virava "e-mail duplicado" e a de slug saía como 500.
  private tratarP2002(erro: unknown): never {
    const prismaErro = erro as { code?: string; meta?: { target?: unknown } };
    if (prismaErro?.code === 'P2002') {
      const alvo = String(
        Array.isArray(prismaErro.meta?.target)
          ? prismaErro.meta.target.join(',')
          : prismaErro.meta?.target,
      );
      if (alvo.includes('slug')) {
        throw new ConflictException(
          'Já existe um estabelecimento com este nome.',
        );
      }
      throw new ConflictException(
        'Já existe um administrador com este e-mail.',
      );
    }
    throw erro;
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
    return (await this.falhasNaJanela({ ipHash })) >= MAX_FALHAS_POR_IP;
  }

  private async emailBloqueado(emailHash: string): Promise<boolean> {
    return (await this.falhasNaJanela({ emailHash })) >= MAX_FALHAS_POR_EMAIL;
  }

  private async falhasNaJanela(alvo: {
    ipHash?: string;
    emailHash?: string;
  }): Promise<number> {
    return this.prisma.tentativaLogin.count({
      where: {
        ...alvo,
        sucesso: false,
        criadoEm: { gte: new Date(Date.now() - JANELA_FALHAS_MS) },
      },
    });
  }

  private async registrarTentativa(
    ip: string,
    emailHash: string | null,
    sucesso: boolean,
  ): Promise<void> {
    await this.prisma.tentativaLogin.create({
      data: { ipHash: this.hashIp(ip), emailHash, sucesso },
    });
  }

  // Remove o que já não influencia mais nenhuma decisão: tentativas de login
  // mais antigas que a janela de lockout (não são contadas nas consultas) e
  // códigos de recuperação consumidos ou expirados. Sem isto, as duas tabelas
  // crescem para sempre e as queries de bloqueio ficam cada vez mais caras.
  private async limparRegistrosAntigos(): Promise<void> {
    const agora = new Date();
    const corteJanela = new Date(agora.getTime() - JANELA_FALHAS_MS);
    await this.prisma.tentativaLogin.deleteMany({
      where: { criadoEm: { lt: corteJanela } },
    });
    await this.prisma.recuperacaoSenha.deleteMany({
      where: {
        OR: [{ usadoEm: { not: null } }, { expiraEm: { lt: agora } }],
      },
    });
  }

  // Nunca armazena o IP em texto puro: grava apenas o hash HMAC-SHA256
  private hashIp(ip: string): string {
    return this.hashSiglao(ip);
  }

  private hashFicticioCache: string | null = null;

  // Hash bcrypt válido (custo idêntico ao real) de uma senha descartável:
  // só existe para gastar o mesmo tempo de CPU de um `compare` de verdade
  // quando a conta consultada não existe.
  private async hashFicticio(): Promise<string> {
    this.hashFicticioCache ??= await hash(
      'conta-inexistente',
      CUSTO_HASH_BCRYPT,
    );
    return this.hashFicticioCache;
  }

  // Mesmo tratamento do IP: o e-mail também só é gravado como hash
  private hashEmail(email: string): string {
    return this.hashSiglao(email.trim().toLowerCase());
  }

  private hashSiglao(valor: string): string {
    return createHmac('sha256', obterSegredo()).update(valor).digest('hex');
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
