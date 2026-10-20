import { LoggerPersonalizado } from './logger-personalizado';

describe('LoggerPersonalizado', () => {
  let saida: string;
  let erro: string;

  beforeEach(() => {
    saida = '';
    erro = '';
    jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((fragmento: unknown): boolean => {
        saida += String(fragmento);
        return true;
      });
    jest
      .spyOn(process.stderr, 'write')
      .mockImplementation((fragmento: unknown): boolean => {
        erro += String(fragmento);
        return true;
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function lerRegistro(linha: string): Record<string, unknown> {
    return JSON.parse(linha.trim()) as Record<string, unknown>;
  }

  describe('formato json', () => {
    it('emite uma linha JSON com timestamp, nível, contexto e mensagem', () => {
      const logger = new LoggerPersonalizado({ formato: 'json' });
      logger.log('Servidor iniciado na porta 3000', 'Bootstrap');

      const registro = lerRegistro(saida);
      expect(registro).toMatchObject({
        nivel: 'log',
        contexto: 'Bootstrap',
        mensagem: 'Servidor iniciado na porta 3000',
      });
      expect(new Date(registro.timestamp as string).toString()).not.toBe(
        'Invalid Date',
      );
      expect(saida.trim().split('\n')).toHaveLength(1);
    });

    it('sobe os campos de mensagem-objeto para a própria linha', () => {
      const logger = new LoggerPersonalizado({ formato: 'json' });
      logger.log(
        { metodo: 'GET', caminho: '/pedidos', status: 201, duracaoMs: 12 },
        'RegistroHttpInterceptor',
      );

      const registro = lerRegistro(saida);
      expect(registro).toMatchObject({
        nivel: 'log',
        contexto: 'RegistroHttpInterceptor',
        metodo: 'GET',
        caminho: '/pedidos',
        status: 201,
        duracaoMs: 12,
      });
      expect(registro.mensagem).toBeUndefined();
    });

    it('grava error/fatal no stderr junto da pilha', () => {
      const logger = new LoggerPersonalizado({ formato: 'json' });
      logger.error('Falha inesperada', 'Error: origem\n    at tela', 'Filtro');

      const registro = lerRegistro(erro);
      expect(registro).toMatchObject({
        nivel: 'error',
        contexto: 'Filtro',
        mensagem: 'Falha inesperada',
        pilha: 'Error: origem\n    at tela',
      });
      expect(saida).toBe('');

      logger.fatal('Processo vai encerrar', 'Shutdown');
      expect(
        lerRegistro(erro.trim().split('\n').pop() as string),
      ).toMatchObject({ nivel: 'fatal', mensagem: 'Processo vai encerrar' });
    });
  });

  describe('formato pretty', () => {
    it('imprime texto legível no stdout com nível, contexto e mensagem', () => {
      const logger = new LoggerPersonalizado({ formato: 'pretty' });
      logger.log('Servidor iniciado', 'Bootstrap');
      logger.warn('Tem algo estranho', 'Cors');

      const linhas = saida.trim().split('\n');
      expect(linhas).toHaveLength(2);
      expect(linhas[0]).toContain('LOG');
      expect(linhas[0]).toContain('[Bootstrap]');
      expect(linhas[0]).toContain('Servidor iniciado');
      expect(linhas[1]).toContain('WARN');
      expect(linhas[1]).toContain('[Cors]');
      // Não é uma linha JSON: o pretty começa com o carimbo de data/hora
      expect(saida.trim().startsWith('{')).toBe(false);
    });

    it('mensagem-objeto sai como JSON e a pilha em linhas seguintes (stderr)', () => {
      const logger = new LoggerPersonalizado({ formato: 'pretty' });
      logger.error({ metodo: 'POST', status: 500 }, 'pilha\n  at tela', 'Http');

      const linhas = erro.trim().split('\n');
      expect(linhas[0]).toContain('ERROR');
      expect(linhas[0]).toContain('[Http]');
      expect(linhas[0]).toContain('{"metodo":"POST","status":500}');
      expect(linhas[1]).toBe('pilha');
      expect(linhas[2]).toBe('  at tela');
      expect(saida).toBe('');
    });
  });

  describe('níveis', () => {
    it('setLogLevels desliga registros abaixo do nível escolhido', () => {
      const logger = new LoggerPersonalizado({ formato: 'json' });
      logger.setLogLevels(['error']);

      logger.log('não deve aparecer', 'Ctx');
      logger.warn('não deve aparecer', 'Ctx');
      logger.error('deve aparecer', undefined, 'Ctx');

      expect(saida).toBe('');
      expect(erro).toContain('deve aparecer');
      expect(erro).not.toContain('não deve aparecer');
    });

    it('todos os níveis ficam habilitados por padrão', () => {
      const logger = new LoggerPersonalizado({ formato: 'json' });
      logger.verbose('verbose ok', 'Ctx');
      logger.debug('debug ok', 'Ctx');

      expect(saida).toContain('verbose ok');
      expect(saida).toContain('debug ok');
    });
  });
});
