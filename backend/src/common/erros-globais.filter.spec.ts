import { BadRequestException, HttpStatus } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { ErrosGlobaisFilter } from './erros-globais.filter';

interface CorpoErro {
  statusCode: number;
  mensagem: string | string[];
  caminho: string;
  timestamp: string;
}

describe('ErrosGlobaisFilter', () => {
  let filter: ErrosGlobaisFilter;

  function criarHost() {
    const corpos: CorpoErro[] = [];
    const response = {
      status: jest.fn().mockReturnThis(),
      json: (corpo: CorpoErro) => {
        corpos.push(corpo);
      },
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ url: '/produtos' }),
      }),
    };
    return { corpos, host } as {
      corpos: CorpoErro[];
      host: Parameters<ErrosGlobaisFilter['catch']>[1];
    };
  }

  beforeEach(() => {
    filter = new ErrosGlobaisFilter();
  });

  it('padroniza HttpException mantendo status e mensagem', () => {
    const { corpos, host } = criarHost();
    filter.catch(new BadRequestException('Dados inválidos.'), host);

    expect(corpos[0]).toMatchObject({
      statusCode: 400,
      mensagem: 'Dados inválidos.',
      caminho: '/produtos',
    });
  });

  it('traduz o rate limit (429) para uma mensagem amigável', () => {
    const { corpos, host } = criarHost();
    filter.catch(new ThrottlerException(), host);

    expect(corpos[0].statusCode).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(corpos[0].mensagem).toContain('Muitas tentativas');
  });

  it('não vaza detalhes de erros inesperados', () => {
    const { corpos, host } = criarHost();
    filter.catch(new Error('segredo interno do servidor'), host);

    expect(corpos[0].statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(corpos[0].mensagem).toContain('inesperado');
    expect(corpos[0].mensagem).not.toContain('segredo interno');
  });
});
