import { type LogLevel, type LoggerService, LOG_LEVELS } from '@nestjs/common';
import type { FormatoLog } from '../config/ambiente';

/**
 * Logger estruturado da aplicação.
 *
 * - `formato: "json"` (padrão em produção): uma linha JSON por registro, com
 *   timestamp, nível, contexto e mensagem — pronta para agregador de logs
 *   (Loki, CloudWatch, Elasticsearch). Campos extras de objetos de log entram
 *   na mesma linha, sem exigir parsing da mensagem.
 * - `formato: "pretty"` (padrão em desenvolvimento): texto legível no console,
 *   para ler sem ferramenta.
 *
 * Instalado no boot via `NestFactory.create(AppModule, { logger })`, o que
 * faz `Logger.overrideLogger`: todos os `new Logger(Contexto)` do código
 * (filtros, interceptors, serviços) e os logs internos do Nest passam por
 * aqui — um único ponto de formato.
 *
 * Erros (`error`/`fatal`) vão para o stderr; o resto, para o stdout. Uma
 * falha na formatação nunca derruba a aplicação: cai num JSON mínimo.
 */
export class LoggerPersonalizado implements LoggerService {
  private niveis: readonly LogLevel[] = LOG_LEVELS;

  constructor(private readonly opcoes: { formato: FormatoLog }) {}

  log(mensagem: unknown, contexto?: string): void {
    this.escrever('log', mensagem, contexto);
  }

  warn(mensagem: unknown, contexto?: string): void {
    this.escrever('warn', mensagem, contexto);
  }

  debug(mensagem: unknown, contexto?: string): void {
    this.escrever('debug', mensagem, contexto);
  }

  verbose(mensagem: unknown, contexto?: string): void {
    this.escrever('verbose', mensagem, contexto);
  }

  error(mensagem: unknown, pilha?: string, contexto?: string): void {
    this.escrever('error', mensagem, contexto, pilha);
  }

  fatal(mensagem: unknown, contexto?: string): void {
    this.escrever('fatal', mensagem, contexto);
  }

  setLogLevels(niveis: LogLevel[]): void {
    this.niveis = niveis;
  }

  private escrever(
    nivel: LogLevel,
    mensagem: unknown,
    contexto?: string,
    pilha?: string,
  ): void {
    if (!this.niveis.includes(nivel)) return;

    let linha: string;
    try {
      linha = this.formatar(nivel, mensagem, contexto, pilha);
    } catch {
      linha = JSON.stringify({
        timestamp: new Date().toISOString(),
        nivel: 'error',
        contexto: 'LoggerPersonalizado',
        mensagem: 'Falha ao formatar registro de log.',
      });
    }

    const destino =
      nivel === 'error' || nivel === 'fatal' ? process.stderr : process.stdout;
    destino.write(`${linha}\n`);
  }

  private formatar(
    nivel: LogLevel,
    mensagem: unknown,
    contexto?: string,
    pilha?: string,
  ): string {
    // Mensagem-objeto (log estruturado): os campos entram na própria linha.
    const objeto =
      typeof mensagem === 'object' &&
      mensagem !== null &&
      !Array.isArray(mensagem)
        ? (mensagem as Record<string, unknown>)
        : null;

    if (this.opcoes.formato === 'pretty') {
      return this.formatarPretty(nivel, mensagem, objeto, contexto, pilha);
    }
    return this.formatarJson(nivel, mensagem, objeto, contexto, pilha);
  }

  private formatarJson(
    nivel: LogLevel,
    mensagem: unknown,
    objeto: Record<string, unknown> | null,
    contexto?: string,
    pilha?: string,
  ): string {
    const registro: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      nivel,
    };
    if (contexto !== undefined) registro.contexto = contexto;

    if (objeto) {
      Object.assign(registro, objeto);
    } else {
      registro.mensagem =
        typeof mensagem === 'string' ? mensagem : JSON.stringify(mensagem);
    }

    if (pilha !== undefined) registro.pilha = pilha;
    return JSON.stringify(registro);
  }

  private formatarPretty(
    nivel: LogLevel,
    mensagem: unknown,
    objeto: Record<string, unknown> | null,
    contexto?: string,
    pilha?: string,
  ): string {
    const carimbo = new Date().toISOString();
    const rotulo = nivel.toUpperCase().padEnd(7);
    const contextoRotulo = contexto ? ` [${contexto}]` : '';
    const texto = objeto ? JSON.stringify(objeto) : String(mensagem);
    const primeira = `${carimbo} ${rotulo}${contextoRotulo} ${texto}`;
    return pilha !== undefined ? `${primeira}\n${pilha}` : primeira;
  }
}
