import { PrismaService } from '../prisma/prisma.service';
import { ConfiguracoesService } from './configuracoes.service';
import {
  CHAVE_PIX_CHAVE,
  CHAVE_PIX_INSTITUICAO,
  CHAVE_PIX_QR,
  CHAVE_PIX_TITULAR,
  CHAVE_PIX_TIPO_CHAVE,
} from './configuracoes.service';

// Banco em memória simplificado: devolve o valor gravado por (estab, chave)
// e o upsert de fato altera o mapa, para que o reler de definirPix funcione
function montarPrisma(linhas: Record<string, string> = {}) {
  const encontrar = jest.fn(
    (args: {
      where: {
        estabelecimentoId_chave: { estabelecimentoId: string; chave: string };
      };
    }) => {
      const { estabelecimentoId, chave } = args.where.estabelecimentoId_chave;
      const valor = linhas[`${estabelecimentoId}:${chave}`];
      return Promise.resolve(valor === undefined ? null : { valor });
    },
  );
  const upsert = jest.fn(
    (args: {
      create: { estabelecimentoId: string; chave: string; valor: string };
    }) => {
      const { estabelecimentoId, chave, valor } = args.create;
      linhas[`${estabelecimentoId}:${chave}`] = valor;
      return Promise.resolve({});
    },
  );
  const deleteMany = jest.fn(
    (args: { where: { estabelecimentoId: string; chave: string } }) => {
      const { estabelecimentoId, chave } = args.where;
      delete linhas[`${estabelecimentoId}:${chave}`];
      return Promise.resolve({ count: 0 });
    },
  );
  const prisma = {
    configuracao: { findUnique: encontrar, upsert, deleteMany },
  } as unknown as PrismaService;
  return { prisma, encontrar, upsert, deleteMany };
}

describe('ConfiguracoesService - dados Pix', () => {
  it('devolve tudo null quando nada foi cadastrado', async () => {
    const { prisma } = montarPrisma();
    const service = new ConfiguracoesService(prisma);

    await expect(service.obterPix('est-1')).resolves.toEqual({
      tipoChave: null,
      chave: null,
      titular: null,
      instituicao: null,
      qrUrl: null,
    });
  });

  it('devolve os valores gravados por chave', async () => {
    const { prisma } = montarPrisma({
      'est-1:pix_tipo_chave': 'CPF',
      'est-1:pix_chave': '123.456.789-00',
      'est-1:pix_titular': 'Maria da Silva',
      'est-1:pix_instituicao': 'Nubank',
      'est-1:pix_qr': '/uploads/est-1/qr.png',
    });
    const service = new ConfiguracoesService(prisma);

    await expect(service.obterPix('est-1')).resolves.toEqual({
      tipoChave: 'CPF',
      chave: '123.456.789-00',
      titular: 'Maria da Silva',
      instituicao: 'Nubank',
      qrUrl: '/uploads/est-1/qr.png',
    });
  });

  it('ignora tipo de chave inválido gravado direto no banco (tabela é livre)', async () => {
    const { prisma } = montarPrisma({
      'est-1:pix_tipo_chave': 'BITCOIN',
      'est-1:pix_chave': 'qualquer',
    });
    const service = new ConfiguracoesService(prisma);

    const pix = await service.obterPix('est-1');
    expect(pix.tipoChave).toBeNull();
    expect(pix.chave).toBe('qualquer');
  });

  it('definirPix grava cada campo na sua chave e devolve o resultado', async () => {
    const { prisma, upsert } = montarPrisma();
    const service = new ConfiguracoesService(prisma);

    const resultado = await service.definirPix('est-1', {
      tipoChave: 'EMAIL',
      chave: 'pizza@exemplo.com',
      titular: 'João',
      instituicao: 'Banco Inter',
      qrUrl: '/uploads/est-1/qr2.png',
    });

    // Um upsert por campo enviado
    expect(upsert).toHaveBeenCalledTimes(5);
    const chaves = upsert.mock.calls.map(
      (c) => (c[0] as { create: { chave: string } }).create.chave,
    );
    expect(chaves).toEqual([
      CHAVE_PIX_TIPO_CHAVE,
      CHAVE_PIX_CHAVE,
      CHAVE_PIX_TITULAR,
      CHAVE_PIX_INSTITUICAO,
      CHAVE_PIX_QR,
    ]);
    expect(resultado).toMatchObject({
      tipoChave: 'EMAIL',
      chave: 'pizza@exemplo.com',
    });
  });

  it('PATCH parcial: campos undefined não são tocados no banco', async () => {
    const { prisma, upsert, deleteMany } = montarPrisma();
    const service = new ConfiguracoesService(prisma);

    await service.definirPix('est-1', { chave: 'novo@exemplo.com' });

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('null limpa a chave (deleteMany) em vez de gravar string vazia', async () => {
    const { prisma, upsert, deleteMany } = montarPrisma();
    const service = new ConfiguracoesService(prisma);

    await service.definirPix('est-1', { titular: null, qrUrl: '' });

    expect(deleteMany).toHaveBeenCalledTimes(2);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('não mistura dados de estabelecimentos diferentes', async () => {
    const { prisma } = montarPrisma({
      'est-1:pix_chave': 'chave-da-casa-1',
      'est-2:pix_chave': 'chave-da-casa-2',
    });
    const service = new ConfiguracoesService(prisma);

    const pix1 = await service.obterPix('est-1');
    const pix2 = await service.obterPix('est-2');
    expect(pix1.chave).toBe('chave-da-casa-1');
    expect(pix2.chave).toBe('chave-da-casa-2');
  });
});
