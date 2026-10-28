import {
  Logger,
  type CallHandler,
  type ExecutionContext,
} from '@nestjs/common';
import { of } from 'rxjs';
import type { Request } from 'express';
import { RegistroHttpInterceptor } from './registro-http.interceptor';

interface RespostaDeTeste {
  statusCode: number;
  cabecalhos: Record<string, string>;
  setHeader(nome: string, valor: string): void;
  on(evento: string, ouvinte: () => void): void;
  disparar(evento: string): void;
}

function criarCenario(
  opcoes: {
    metodo?: string;
    url?: string;
    cabecalhos?: Record<string, string>;
    statusCode?: number;
  } = {},
) {
  const ouvintes: Record<string, Array<() => void>> = {
    finish: [],
    close: [],
  };

  const resposta: RespostaDeTeste = {
    statusCode: opcoes.statusCode ?? 200,
    cabecalhos: {},
    setHeader(nome, valor) {
      this.cabecalhos[nome] = valor;
    },
    on(evento, ouvinte) {
      (ouvintes[evento] ??= []).push(ouvinte);
    },
    disparar(evento) {
      (ouvintes[evento] ?? []).forEach((ouvinte) => ouvinte());
    },
  };

  const requisicao = {
    method: opcoes.metodo ?? 'GET',
    url: opcoes.url ?? '/pedidos',
    headers: opcoes.cabecalhos ?? {},
  } as unknown as Request;

  const contexto = {
    switchToHttp: () => ({
      getRequest: () => requisicao,
      getResponse: () => resposta,
    }),
  } as unknown as ExecutionContext;

  const proximo: CallHandler = { handle: () => of({ ok: true }) };

  return { requisicao, resposta, contexto, proximo, ouvintes };
}

describe('RegistroHttpInterceptor', () => {
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  let erro: jest.SpyInstance;

  beforeEach(() => {
    log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    erro = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function interceptar(cenario: ReturnType<typeof criarCenario>) {
    return new RegistroHttpInterceptor().intercept(
      cenario.contexto,
      cenario.proximo,
    );
  }

  it('gera um X-Request-Id quando o cliente não envia', () => {
    const cenario = criarCenario();
    interceptar(cenario);

    const id = cenario.resposta.cabecalhos['X-Request-Id'];
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(cenario.requisicao.requisicaoId).toBe(id);
  });

  it('repassa o X-Request-Id válido do cliente (correlação ponta a ponta)', () => {
    const cenario = criarCenario({
      cabecalhos: { 'x-request-id': 'trace-abc.123_XYZ' },
    });
    interceptar(cenario);

    expect(cenario.resposta.cabecalhos['X-Request-Id']).toBe(
      'trace-abc.123_XYZ',
    );
    expect(cenario.requisicao.requisicaoId).toBe('trace-abc.123_XYZ');
  });

  it('substitui um X-Request-Id inválido por um id gerado', () => {
    const cenario = criarCenario({
      cabecalhos: { 'x-request-id': 'x'.repeat(500) },
    });
    interceptar(cenario);

    const id = cenario.resposta.cabecalhos['X-Request-Id'];
    expect(id).not.toBe('x'.repeat(500));
    expect(id).toHaveLength(36);
  });

  it('não registra GET /health (sondagem), mas responde com o X-Request-Id', () => {
    const cenario = criarCenario({ url: '/health?completo=1' });
    interceptar(cenario);
    cenario.resposta.disparar('finish');

    expect(log).not.toHaveBeenCalled();
    expect(cenario.resposta.cabecalhos['X-Request-Id']).toBeDefined();
  });

  it('registra a resposta com método, caminho, status, duração e id', () => {
    const cenario = criarCenario({ metodo: 'POST', url: '/pedidos' });
    interceptar(cenario);
    cenario.resposta.disparar('finish');

    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        evento: 'enviado',
        metodo: 'POST',
        caminho: '/pedidos',
        status: 200,
        requisicaoId: cenario.requisicao.requisicaoId,
      }),
    );
    const registro = (log.mock.calls[0] as unknown[])[0] as {
      duracaoMs: number;
    };
    expect(registro.duracaoMs).toBeGreaterThanOrEqual(0);
  });

  it('sobe o nível conforme o status final: 4xx warn, 5xx error', () => {
    const cenario404 = criarCenario({ url: '/nao-existe', statusCode: 404 });
    interceptar(cenario404);
    cenario404.resposta.disparar('finish');
    expect(warn).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));

    const cenario500 = criarCenario({ url: '/pedidos', statusCode: 500 });
    interceptar(cenario500);
    cenario500.resposta.disparar('finish');
    expect(erro).toHaveBeenCalledWith(expect.objectContaining({ status: 500 }));

    expect(log).not.toHaveBeenCalled();
  });

  it('emite um único registro por requisição (finish e close)', () => {
    const cenario = criarCenario();
    interceptar(cenario);
    cenario.resposta.disparar('finish');
    cenario.resposta.disparar('close');

    expect(log).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('registra conexão abortada (close sem finish) como warn', () => {
    const cenario = criarCenario();
    interceptar(cenario);
    cenario.resposta.disparar('close');

    expect(log).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ evento: 'abortado' }),
    );
  });

  it('deixa a requisição passar pelo handler normalmente', (conclusao) => {
    const cenario = criarCenario();
    let valor: unknown;
    interceptar(cenario).subscribe((saida) => {
      valor = saida;
      expect(valor).toEqual({ ok: true });
      conclusao();
    });
  });
});
