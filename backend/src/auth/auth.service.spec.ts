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

// Custo de bcrypt baixo: os testes criam senha de verdade, e o custo padrão
// (10) tornaria a suíte lenta sem acrescentar cobertura.
const CUSTO_TESTE = 4;
const ID_USUARIO = 'usr-1';
const ID_ESTABELECIMENTO = 'est-1';
const EMAIL_ATUAL = 'dono@pizzaria.com.br';

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
        ...data,
        estabelecimento: {
          id: ID_ESTABELECIMENTO,
          nome: 'Pizzaria do Zé',
          slug: 'pizzaria-do-ze',
          telefone: null,
        },
      }),
    );

    // Duas consultas diferentes chegam aqui: uma pelo id (para saber o nome
    // atual) e outra pelo slug (para garantir slug único). A segunda precisa
    // devolver o id, senão `gerarSlugUnico` nunca encerra o laço.
    estabelecimentoFindUnique = jest
      .fn()
      .mockImplementation((args: { where?: { slug?: string } }) =>
        args?.where?.slug
          ? Promise.resolve({ id: ID_ESTABELECIMENTO })
          : Promise.resolve({ nome: 'Pizzaria do Zé' }),
      );

    estabelecimentoUpdate = jest.fn().mockResolvedValue({});

    const prisma = {
      usuario: {
        findUnique: usuarioFindUnique,
        update: usuarioUpdate,
      },
      estabelecimento: {
        findUnique: estabelecimentoFindUnique,
        update: estabelecimentoUpdate,
      },
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
      await service.atualizarPerfil(
        ID_USUARIO,
        'Pizzaria do Zé',
        'NOVO@atacante.com',
        undefined,
        undefined,
        undefined,
        'senhaAntiga123',
      );

      expect(usuarioUpdate).toHaveBeenCalledTimes(1);
      expect(dadosDoUpdate().email).toBe('novo@atacante.com');
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
