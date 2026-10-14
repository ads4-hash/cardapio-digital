import { BadRequestException } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { EnvioEmailService } from '../envio-email/envio-email.service';
import { EstabelecimentosService } from '../estabelecimentos/estabelecimentos.service';
import { AuthService } from './auth.service';

// O AuthService importa @nestjs/jwt, que é ESM e não é transformado pelo Jest
// (CJS). O serviço só usa o JwtService via injeção de dependência, então
// carregamos um stub no lugar do módulo real.
jest.mock('@nestjs/jwt', () => ({ JwtService: class {} }));

// Login/refresh/recuperação hasheiam IPs e tokens com o segredo (obterSegredo)
// para derivar a chave HMAC. Sem a env, `obterSegredo()` lança — definimos
// valores explícitos de teste para a suíte rodar em qualquer ambiente (inclusive
// CI, onde o .env nem existe).
process.env.JWT_SECRET = 'segredo-de-teste';
process.env.HASH_SECRET = 'hash-de-teste';

// Custo de bcrypt baixo: os testes criam senha de verdade, e o custo padrão
// (10) tornaria a suíte lenta sem acrescentar cobertura.
const CUSTO_TESTE = 4;
const ID_USUARIO = 'usr-1';
const ID_ESTABELECIMENTO = 'est-1';
const EMAIL_ATUAL = 'dono@pizzaria.com.br';

// `expect.objectContaining` devolve `any`; quando usado como VALOR de uma
// propriedade (ex.: `data:` dentro de outro objetoContaining) o eslint acusa
// atribuição insegura. Este helper mantém o matcher e devolve um tipo seguro.
function contendo(esperado: unknown): Record<string, unknown> {
  return expect.objectContaining(esperado) as Record<string, unknown>;
}

/**
 * Cobre a reautenticação de `atualizarPerfil`: trocar e-mail ou senha só passa
 * com a senha atual. Sem isso, um token roubado permitia tomar a conta com um
 * único PATCH.
 */
describe('AuthService.atualizarPerfil', () => {
  let service: AuthService;
  let senhaHashAtual: string;

  let usuarioFindUnique: jest.Mock;
  let usuarioUpdate: jest.Mock;
  let estabelecimentoFindUnique: jest.Mock;
  let estabelecimentoUpdate: jest.Mock;

  /** Dados extras que o service grava, capturados a partir do update. */
  function dadosDoUpdate(): Record<string, unknown> {
    const [args] = usuarioUpdate.mock.calls[0] as [
      { data: Record<string, unknown> },
    ];
    return args.data;
  }

  beforeEach(async () => {
    senhaHashAtual = await hash('senhaAntiga123', CUSTO_TESTE);

    usuarioFindUnique = jest
      .fn()
      // Primeira chamada: conferência do e-mail/hash atual.
      // Demais: reidratação feita por `me` no fim do fluxo.
      .mockResolvedValueOnce({ email: EMAIL_ATUAL, senhaHash: senhaHashAtual })
      .mockResolvedValue({
        id: ID_USUARIO,
        nome: 'Pizzaria do Zé',
        email: EMAIL_ATUAL,
        senhaHash: senhaHashAtual,
        estabelecimentoId: ID_ESTABELECIMENTO,
        estabelecimento: {
          id: ID_ESTABELECIMENTO,
          nome: 'Pizzaria do Zé',
          slug: 'pizzaria-do-ze',
          telefone: null,
        },
      });

    usuarioUpdate = jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({
        id: ID_USUARIO,
        estabelecimentoId: ID_ESTABELECIMENTO,
        tokenVersao: 1,
        ...data,
        estabelecimento: {
          id: ID_ESTABELECIMENTO,
          nome: 'Pizzaria do Zé',
          slug: 'pizzaria-do-ze',
          telefone: null,
        },
      }),
    );

    // Consulta pelo id para saber o nome atual do estabelecimento. O slug é
    // imutável, então nenhuma busca por slug acontece mais neste fluxo.
    estabelecimentoFindUnique = jest
      .fn()
      .mockImplementation((args: { where?: { slug?: string } }) =>
        args?.where?.slug
          ? Promise.resolve({ id: ID_ESTABELECIMENTO })
          : Promise.resolve({ nome: 'Pizzaria do Zé' }),
      );

    estabelecimentoUpdate = jest.fn().mockResolvedValue({});

    const refreshToken = {
      create: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue(null),
    };

    const prisma = {
      usuario: {
        findUnique: usuarioFindUnique,
        update: usuarioUpdate,
        findUniqueOrThrow: jest.fn().mockResolvedValue({ tokenVersao: 1 }),
      },
      estabelecimento: {
        findUnique: estabelecimentoFindUnique,
        update: estabelecimentoUpdate,
      },
      refreshToken,
      $transaction: jest.fn((arg: unknown[]) => Promise.all(arg)),
    } as unknown as PrismaService;

    const envioEmail = {
      configurado: jest.fn().mockReturnValue(false),
      enviarEmail: jest.fn().mockResolvedValue(false),
    } as unknown as EnvioEmailService;

    const estabelecimentos = {
      porSlug: jest.fn(),
    } as unknown as EstabelecimentosService;

    // O secret do JWT é lido em auth.module, não aqui, então um sign stub basta.
    const jwtService = {
      sign: jest.fn().mockReturnValue('token-fake'),
    };

    service = new AuthService(
      prisma,
      jwtService as never,
      estabelecimentos,
      envioEmail,
    );
  });

  describe('alterações que não mexem na credencial', () => {
    it('altera nome e telefone sem pedir a senha atual', async () => {
      await service.atualizarPerfil(
        ID_USUARIO,
        'Pizzaria do Zé Jr',
        EMAIL_ATUAL,
        undefined,
        undefined,
        '11988887777',
      );

      expect(usuarioUpdate).toHaveBeenCalledTimes(1);
      expect(dadosDoUpdate().email).toBe(EMAIL_ATUAL);
      expect(dadosDoUpdate().senhaHash).toBeUndefined();
      expect(estabelecimentoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { telefone: '11988887777' },
        }),
      );
    });

    it('normaliza o e-mail enviado sem alterar o valor', async () => {
      // O formulário sempre reenvia o e-mail, às vezes com caixa diferente.
      // Não pode contar como troca de credencial.
      await service.atualizarPerfil(
        ID_USUARIO,
        'Pizzaria do Zé',
        '  DONO@Pizzaria.com.BR  ',
      );

      expect(usuarioUpdate).toHaveBeenCalledTimes(1);
      expect(dadosDoUpdate().email).toBe(EMAIL_ATUAL);
    });

    it('renomeia o estabelecimento sem trocar o slug da URL pública', async () => {
      await service.atualizarPerfil(
        ID_USUARIO,
        'Pizzaria do Zé Renovada',
        EMAIL_ATUAL,
      );

      // O nome muda, mas o slug permanece: links de cardápio já compartilhados
      // precisam continuar válidos.
      expect(estabelecimentoUpdate).toHaveBeenCalledWith({
        where: { id: ID_ESTABELECIMENTO },
        data: { nome: 'Pizzaria do Zé Renovada' },
      });
      const algumaTrocaDeSlug = estabelecimentoUpdate.mock.calls.some(
        ([args]) => 'slug' in (args as { data: Record<string, unknown> }).data,
      );
      expect(algumaTrocaDeSlug).toBe(false);
    });
  });

  describe('troca de e-mail', () => {
    it('recusa quando a senha atual não foi enviada', async () => {
      await expect(
        service.atualizarPerfil(
          ID_USUARIO,
          'Pizzaria do Zé',
          'novo@atacante.com',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(usuarioUpdate).not.toHaveBeenCalled();
    });

    it('recusa quando a senha atual está errada', async () => {
      await expect(
        service.atualizarPerfil(
          ID_USUARIO,
          'Pizzaria do Zé',
          'novo@atacante.com',
          undefined,
          undefined,
          undefined,
          'senhaErrada',
        ),
      ).rejects.toThrow('Senha atual incorreta.');

      expect(usuarioUpdate).not.toHaveBeenCalled();
    });

    it('aceita com a senha atual correta', async () => {
      const resposta = await service.atualizarPerfil(
        ID_USUARIO,
        'Pizzaria do Zé',
        'NOVO@atacante.com',
        undefined,
        undefined,
        undefined,
        'senhaAntiga123',
      );

      // Uma chamada grava o e-mail; a outra (encerrarTodasAsSessoes) incrementa
      // a versão do token para derrubar as sessões antigas.
      expect(usuarioUpdate).toHaveBeenCalledTimes(2);
      expect(dadosDoUpdate().email).toBe('novo@atacante.com');
      // Troca de credencial devolve tokens novos para manter este dispositivo.
      expect(resposta.token).toBe('token-fake');
      expect(typeof resposta.refreshToken).toBe('string');
    });
  });

  describe('troca de senha', () => {
    it('recusa sem a senha atual, mesmo mantendo o e-mail', async () => {
      await expect(
        service.atualizarPerfil(
          ID_USUARIO,
          'Pizzaria do Zé',
          EMAIL_ATUAL,
          'senhaNova123',
          'senhaNova123',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(usuarioUpdate).not.toHaveBeenCalled();
    });

    it('recusa quando as senhas novas não conferem', async () => {
      await expect(
        service.atualizarPerfil(
          ID_USUARIO,
          'Pizzaria do Zé',
          EMAIL_ATUAL,
          'senhaNova123',
          'outraCoisa',
          undefined,
          'senhaAntiga123',
        ),
      ).rejects.toThrow('As senhas não conferem.');
    });

    it('grava o novo hash quando a senha atual confere', async () => {
      await service.atualizarPerfil(
        ID_USUARIO,
        'Pizzaria do Zé',
        EMAIL_ATUAL,
        'senhaNova123',
        'senhaNova123',
        undefined,
        'senhaAntiga123',
      );

      const novoHash = dadosDoUpdate().senhaHash as string;
      expect(typeof novoHash).toBe('string');
      expect(novoHash).not.toBe(senhaHashAtual);
      expect(await compare('senhaNova123', novoHash)).toBe(true);
    });
  });

  it('valida a senha atual enviada mesmo sem troca de credencial', async () => {
    // Digitou a senha por engano: confirmar é melhor que ignorar em silêncio,
    // senão a pessoa acredita que a senha foi verificada.
    await expect(
      service.atualizarPerfil(
        ID_USUARIO,
        'Pizzaria do Zé',
        EMAIL_ATUAL,
        undefined,
        undefined,
        undefined,
        'senhaErrada',
      ),
    ).rejects.toThrow('Senha atual incorreta.');

    expect(usuarioUpdate).not.toHaveBeenCalled();
  });
});

/**
 * Cobertura do onboarding self-service: cada POST /auth/registrar cria um
 * estabelecimento novo (multi-tenant) e o administrador dele. O antigo bloqueio
 * de "somente o primeiro usuário" foi removido.
 */
describe('AuthService.registrar', () => {
  let service: AuthService;

  let estabelecimentoCreate: jest.Mock;
  let usuarioCreate: jest.Mock;
  let tentativaLoginCreate: jest.Mock;

  function criarService(): void {
    estabelecimentoCreate = jest.fn().mockResolvedValue({ id: 'est-novo' });
    usuarioCreate = jest.fn().mockResolvedValue({
      id: 'usr-novo',
      nome: 'Pizzaria Nova',
      email: 'dono@nova.com',
      estabelecimento: {
        id: 'est-novo',
        nome: 'Pizzaria Nova',
        slug: 'pizzaria-nova',
        telefone: null,
      },
    });
    tentativaLoginCreate = jest.fn().mockResolvedValue({});

    // `$transaction(cb)` executa o callback com um cliente fake; o `gerarSlugUnico`
    // também chama `findUnique`, que devolve null (slug livre).
    const tx = {
      usuario: { create: usuarioCreate },
      estabelecimento: {
        create: estabelecimentoCreate,
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    const prisma = {
      $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
      tentativaLogin: { create: tentativaLoginCreate },
      refreshToken: { create: jest.fn().mockResolvedValue({}) },
    } as unknown as PrismaService;

    const jwtService = { sign: jest.fn().mockReturnValue('token-fake') };
    const estabelecimentos = {
      porSlug: jest.fn(),
    } as unknown as EstabelecimentosService;
    const envioEmail = {
      configurado: jest.fn().mockReturnValue(false),
      enviarEmail: jest.fn(),
    } as unknown as EnvioEmailService;

    service = new AuthService(
      prisma,
      jwtService as never,
      estabelecimentos,
      envioEmail,
    );
  }

  it('cria o estabelecimento e o administrador no cadastro', async () => {
    criarService();

    const resposta = await service.registrar(
      'Pizzaria Nova',
      'Pizzaria Nova',
      'dono@nova.com',
      'senhaForte123',
      'senhaForte123',
      null,
      '127.0.0.1',
    );

    expect(estabelecimentoCreate).toHaveBeenCalledTimes(1);
    expect(usuarioCreate).toHaveBeenCalledTimes(1);
    expect(resposta.token).toBe('token-fake');
    expect(resposta.usuario.email).toBe('dono@nova.com');
  });

  it('permite vários cadastros: um estabelecimento por loja', async () => {
    criarService();

    await service.registrar(
      'Loja A',
      'Loja A',
      'a@exemplo.com',
      'senhaForte123',
      'senhaForte123',
      null,
      '127.0.0.1',
    );
    await service.registrar(
      'Loja B',
      'Loja B',
      'b@exemplo.com',
      'senhaForte123',
      'senhaForte123',
      null,
      '127.0.0.1',
    );

    expect(estabelecimentoCreate).toHaveBeenCalledTimes(2);
    expect(usuarioCreate).toHaveBeenCalledTimes(2);
  });

  it('recusa senhas que não conferem antes de escrever no banco', async () => {
    criarService();

    await expect(
      service.registrar(
        'Pizzaria',
        'Pizzaria',
        'dono@pizzaria.com',
        'senhaA',
        'senhaB',
        null,
        '127.0.0.1',
      ),
    ).rejects.toThrow('As senhas não conferem.');

    expect(estabelecimentoCreate).not.toHaveBeenCalled();
    expect(usuarioCreate).not.toHaveBeenCalled();
  });
});

/**
 * Cobre o fluxo de login: lockout por IP/e-mail, limpeza do histórico em caso
 * de sucesso e emissão do par access + refresh.
 */
describe('AuthService.login', () => {
  let service: AuthService;
  let tentativaLoginCount: jest.Mock;
  let tentativaLoginCreate: jest.Mock;
  let tentativaLoginDeleteMany: jest.Mock;
  let usuarioFindUnique: jest.Mock;
  let refreshTokenCreate: jest.Mock;
  let jwtSign: jest.Mock;

  const SENHA_CORRETA = 'senhaCorreta123';

  async function construir(
    opcoes: {
      bloqueioIp?: number;
      bloqueioEmail?: number;
      usuario?: unknown;
    } = {},
  ) {
    const senhaHash = await hash(SENHA_CORRETA, CUSTO_TESTE);
    const usuarioPadrao = {
      id: ID_USUARIO,
      nome: 'Pizzaria do Zé',
      email: EMAIL_ATUAL,
      tokenVersao: 2,
      senhaHash,
      estabelecimento: {
        id: ID_ESTABELECIMENTO,
        nome: 'Pizzaria do Zé',
        slug: 'pizzaria-do-ze',
        telefone: null,
      },
    };

    tentativaLoginCount = jest
      .fn()
      .mockResolvedValueOnce(opcoes.bloqueioIp ?? 0)
      .mockResolvedValueOnce(opcoes.bloqueioEmail ?? 0);
    tentativaLoginCreate = jest.fn().mockResolvedValue({});
    tentativaLoginDeleteMany = jest.fn().mockResolvedValue({ count: 1 });
    refreshTokenCreate = jest.fn().mockResolvedValue({});
    usuarioFindUnique = jest
      .fn()
      .mockResolvedValue(opcoes.usuario ?? usuarioPadrao);

    // O token carrega a versão atual: `tv = 2` vira "token-2".
    jwtSign = jest
      .fn()
      .mockImplementation(
        (payload: { tv?: number }) => `token-${payload.tv ?? 0}`,
      );

    const prisma = {
      tentativaLogin: {
        count: tentativaLoginCount,
        create: tentativaLoginCreate,
        deleteMany: tentativaLoginDeleteMany,
      },
      usuario: { findUnique: usuarioFindUnique },
      refreshToken: {
        create: refreshTokenCreate,
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      recuperacaoSenha: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn((arg: unknown[]) => Promise.all(arg)),
    } as unknown as PrismaService;

    const estabelecimentos = {
      porSlug: jest.fn(),
    } as unknown as EstabelecimentosService;
    const envioEmail = {
      configurado: jest.fn().mockReturnValue(false),
      enviarEmail: jest.fn(),
    } as unknown as EnvioEmailService;

    service = new AuthService(
      prisma,
      { sign: jwtSign } as never,
      estabelecimentos,
      envioEmail,
    );
  }

  it('emite o par de tokens e limpa o histórico de falhas no sucesso', async () => {
    await construir();
    const resposta = await service.login(EMAIL_ATUAL, SENHA_CORRETA, '1.1.1.1');

    expect(resposta.token).toBe('token-2');
    expect(typeof resposta.refreshToken).toBe('string');
    expect(resposta.usuario.id).toBe(ID_USUARIO);
    // Limpa as falhas do IP e do e-mail registradas na janela
    expect(tentativaLoginDeleteMany.mock.calls.length).toBeGreaterThanOrEqual(
      2,
    );
    expect(tentativaLoginCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: contendo({ sucesso: true }),
      }),
    );
  });

  it('rejeita com 429 após 5 falhas do mesmo IP', async () => {
    await construir({ bloqueioIp: 5 });
    await expect(
      service.login('quem@e.com', 'x', '1.1.1.1'),
    ).rejects.toMatchObject({ status: 429 });
    expect(usuarioFindUnique).not.toHaveBeenCalled();
  });

  it('rejeita com 429 após 10 falhas do mesmo e-mail', async () => {
    await construir({ bloqueioEmail: 10 });
    await expect(
      service.login(EMAIL_ATUAL, 'x', '2.2.2.2'),
    ).rejects.toMatchObject({ status: 429 });
  });

  it('responde 401 e registra a falha quando a senha está errada', async () => {
    await construir();
    await expect(
      service.login(EMAIL_ATUAL, 'senhaErrada', '3.3.3.3'),
    ).rejects.toMatchObject({ status: 401 });
    expect(tentativaLoginCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: contendo({ sucesso: false }),
      }),
    );
  });
});

/**
 * Cobre o refresh token (rotação, expiração, reuso revogado) e o logout.
 */
describe('AuthService.renovarTokens', () => {
  let service: AuthService;
  let refreshTokenFindUnique: jest.Mock;
  let refreshTokenCreate: jest.Mock;
  let refreshTokenUpdate: jest.Mock;
  let refreshTokenUpdateMany: jest.Mock;
  let usuarioUpdate: jest.Mock;
  let $transaction: jest.Mock;

  const USUARIO = {
    id: ID_USUARIO,
    nome: 'Pizzaria do Zé',
    email: EMAIL_ATUAL,
    tokenVersao: 3,
    estabelecimento: {
      id: ID_ESTABELECIMENTO,
      nome: 'Pizzaria do Zé',
      slug: 'pizzaria-do-ze',
      telefone: null,
    },
  };

  function registroValido() {
    return {
      id: 'rf-1',
      usuarioId: ID_USUARIO,
      tokenHash: 'hash',
      expiraEm: new Date(Date.now() + 60 * 60 * 1000),
      revogadoEm: null as Date | null,
      usuario: USUARIO,
    };
  }

  function construir(registro: unknown): void {
    refreshTokenFindUnique = jest.fn().mockResolvedValue(registro);
    refreshTokenCreate = jest.fn().mockResolvedValue({});
    refreshTokenUpdate = jest.fn().mockResolvedValue({});
    refreshTokenUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    usuarioUpdate = jest.fn().mockResolvedValue({});
    $transaction = jest.fn((arg: unknown[]) => Promise.all(arg));

    const prisma = {
      refreshToken: {
        findUnique: refreshTokenFindUnique,
        create: refreshTokenCreate,
        update: refreshTokenUpdate,
        updateMany: refreshTokenUpdateMany,
      },
      usuario: { update: usuarioUpdate },
      $transaction,
    } as unknown as PrismaService;

    const jwtSign = jest
      .fn()
      .mockImplementation(
        (payload: { tv?: number }) => `token-${payload.tv ?? 0}`,
      );
    const estabelecimentos = {
      porSlug: jest.fn(),
    } as unknown as EstabelecimentosService;
    const envioEmail = {
      configurado: jest.fn().mockReturnValue(false),
      enviarEmail: jest.fn(),
    } as unknown as EnvioEmailService;

    service = new AuthService(
      prisma,
      { sign: jwtSign } as never,
      estabelecimentos,
      envioEmail,
    );
  }

  it('rotaciona o token: revoga o antigo e cria um novo par', async () => {
    construir(registroValido());
    const resposta = await service.renovarTokens('token-antigo');

    expect(refreshTokenUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'rf-1' } }),
    );
    expect(refreshTokenCreate).toHaveBeenCalled();
    expect($transaction).toHaveBeenCalledWith(expect.any(Array));
    expect(resposta.token).toBe('token-3');
    expect(resposta.usuario.id).toBe(ID_USUARIO);
  });

  it('rejeita token desconhecido sem tocar em nada', async () => {
    construir(null);
    await expect(service.renovarTokens('suposto')).rejects.toMatchObject({
      status: 401,
    });
    expect($transaction).not.toHaveBeenCalled();
  });

  it('rejeita token expirado', async () => {
    construir({ ...registroValido(), expiraEm: new Date(Date.now() - 1000) });
    await expect(service.renovarTokens('expirado')).rejects.toMatchObject({
      status: 401,
    });
    expect($transaction).not.toHaveBeenCalled();
  });

  it('reutilizar um token revogado encerra TODAS as sessões (roubo)', async () => {
    construir({ ...registroValido(), revogadoEm: new Date() });
    await expect(service.renovarTokens('usado')).rejects.toMatchObject({
      status: 401,
    });
    expect(usuarioUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ID_USUARIO },
        data: { tokenVersao: { increment: 1 } },
      }),
    );
    expect(refreshTokenUpdateMany).toHaveBeenCalled();
  });
});

describe('AuthService.logout', () => {
  let service: AuthService;
  let refreshTokenUpdateMany: jest.Mock;

  function construir(): void {
    refreshTokenUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      refreshToken: {
        updateMany: refreshTokenUpdateMany,
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((arg: unknown[]) => Promise.all(arg)),
    } as unknown as PrismaService;
    const jwtSign = jest.fn().mockReturnValue('token');
    const estabelecimentos = {
      porSlug: jest.fn(),
    } as unknown as EstabelecimentosService;
    const envioEmail = {
      configurado: jest.fn().mockReturnValue(false),
      enviarEmail: jest.fn(),
    } as unknown as EnvioEmailService;

    service = new AuthService(
      prisma,
      jwtSign as never,
      estabelecimentos,
      envioEmail,
    );
  }

  it('revoga o refresh token deste dispositivo', async () => {
    construir();
    await service.logout('token-do-app', ID_USUARIO);
    expect(refreshTokenUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: contendo({
          usuarioId: ID_USUARIO,
          revogadoEm: null,
        }),
        data: contendo({ revogadoEm: expect.any(Date) as unknown }),
      }),
    );
  });

  it('é idempotente para token já revogado ou desconhecido', async () => {
    construir();
    refreshTokenUpdateMany.mockResolvedValue({ count: 0 });
    const resposta = await service.logout('qualquer', ID_USUARIO);
    expect(resposta.mensagem).toBe('Sessão encerrada.');
  });
});

/**
 * Redefinir a senha agora encerra todas as sessões: bump da tokenVersao
 * (mata os access tokens) + revoga os refresh tokens ativos.
 */
describe('AuthService.redefinirSenha', () => {
  let service: AuthService;
  let recuperacaoFindFirst: jest.Mock;
  let usuarioUpdate: jest.Mock;
  let recuperacaoUpdateMany: jest.Mock;
  let refreshTokenUpdateMany: jest.Mock;

  function construir(): void {
    recuperacaoFindFirst = jest.fn().mockResolvedValue({
      id: 'rec-1',
      usuarioId: ID_USUARIO,
      tokenHash: 'hash',
      expiraEm: new Date(Date.now() + 60_000),
      usadoEm: null,
    });
    usuarioUpdate = jest.fn().mockResolvedValue({});
    recuperacaoUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    refreshTokenUpdateMany = jest.fn().mockResolvedValue({ count: 2 });

    const prisma = {
      recuperacaoSenha: {
        findFirst: recuperacaoFindFirst,
        updateMany: recuperacaoUpdateMany,
      },
      usuario: { update: usuarioUpdate },
      refreshToken: { updateMany: refreshTokenUpdateMany },
      $transaction: jest.fn((arg: unknown[]) => Promise.all(arg)),
    } as unknown as PrismaService;

    const jwtSign = jest.fn().mockReturnValue('token');
    const estabelecimentos = {
      porSlug: jest.fn(),
    } as unknown as EstabelecimentosService;
    const envioEmail = {
      configurado: jest.fn().mockReturnValue(false),
      enviarEmail: jest.fn(),
    } as unknown as EnvioEmailService;

    service = new AuthService(
      prisma,
      jwtSign as never,
      estabelecimentos,
      envioEmail,
    );
  }

  it('troca a senha, consome o código e encerra todas as sessões', async () => {
    construir();
    await service.redefinirSenha('codigo', 'senhaNova123', 'senhaNova123');

    expect(usuarioUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ID_USUARIO },
        data: contendo({ tokenVersao: { increment: 1 } }),
      }),
    );
    expect(refreshTokenUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: contendo({
          usuarioId: ID_USUARIO,
          revogadoEm: null,
        }),
      }),
    );
    expect(recuperacaoUpdateMany).toHaveBeenCalled();
  });

  it('rejeita código inválido ou já consumido', async () => {
    construir();
    recuperacaoFindFirst.mockResolvedValue(null);
    await expect(
      service.redefinirSenha('x', 'senhaNova123', 'senhaNova123'),
    ).rejects.toMatchObject({ status: 400 });
    expect(usuarioUpdate).not.toHaveBeenCalled();
  });
});
