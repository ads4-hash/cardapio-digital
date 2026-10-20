import { BadRequestException, HttpStatus, Logger } from '@nestjs/common';
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

  function criarHost(requisicao: Record<string, unknown> = {}) {
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
        getRequest: () => ({ url: '/produtos', ...requisicao }),
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

  it('cita o requisicaoId no log de erro inesperado (correlação)', () => {
    const logErro = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const { host } = criarHost({ requisicaoId: 'req-abc123' });

    filter.catch(new Error('estouro interno'), host);

    expect(logErro).toHaveBeenCalledWith(
      expect.stringContaining('requisicaoId=req-abc123'),
      expect.stringContaining('Error: estouro interno'),
    );
    logErro.mockRestore();
  });

  it('loga o erro inesperado sem requisicaoId quando não há interceptor', () => {
    const logErro = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const { host } = criarHost();

    filter.catch(new Error('estouro interno'), host);

    expect(logErro).toHaveBeenCalledWith(
      'estouro interno',
      expect.stringContaining('Error: estouro interno'),
    );
    logErro.mockRestore();
  });
});
