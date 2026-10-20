import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';

// Sondagem do orquestrador/k8s: altíssimo volume e nenhum valor diagnóstico —
// registrar só polui o log.
const CAMINHO_HEALTH = /^\/health(?:\?|$)/;

// Formato aceito para um X-Request-Id vindo de fora (UUID, traceparent etc).
// Header não é confiável por definição: só repassa o remetente se o valor
// tiver cara de identificador, e gera um novo no lugar — senão um valor
// arbitrário (espaços, quebras de linha, megabytes) entraria no log.
const ID_REMETENTE = /^[A-Za-z0-9._-]{8,128}$/;

/**
 * Acesso log + correlação de requisições.
 *
 * - Gera/repassa `X-Request-Id` (response header) e grava em
 *   `req.requisicaoId`, para o filtro de erros e qualquer outro log poderem
 *   citar o mesmo identificador — é o que permite amarrar "esta resposta de
 *   500" à linha de log da requisição num agregador.
 * - Ao terminar (finish ou conexão abortada) emite um registro estruturado com
 *   método, caminho, status, duração e o id. Nível por status: 5xx error,
 *   4xx warn, resto log.
 *
 * O registro é feito nos eventos da resposta (e não no tap do handler) para
 * que o status final seja o de verdade: interceptors rodam antes de o Nest
 * aplicar o código (ex.: 201 de POST), e uma exceção tratada pelo filtro
 * nunca passaria pelo tap.
 */
@Injectable()
export class RegistroHttpInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RegistroHttpInterceptor.name);

  intercept(
    contexto: ExecutionContext,
    proximo: CallHandler,
  ): Observable<unknown> {
    const requisicao = contexto.switchToHttp().getRequest<Request>();
    const resposta = contexto.switchToHttp().getResponse<Response>();

    const requisicaoId = this.obterId(requisicao);
    requisicao.requisicaoId = requisicaoId;
    resposta.setHeader('X-Request-Id', requisicaoId);

    if (CAMINHO_HEALTH.test(requisicao.url) && requisicao.method === 'GET') {
      return proximo.handle();
    }

    const inicio = Date.now();
    let jaRegistrou = false;

    const registrar = (evento: 'enviado' | 'abortado'): void => {
      // 'finish' vem antes de 'close' na resposta normal; o close de uma
      // conexão abortada é o único evento. A flag garante um registro por
      // requisição, qual quer que chegue primeiro.
      if (jaRegistrou) return;
      jaRegistrou = true;

      const registro = {
        evento,
        metodo: requisicao.method,
        caminho: requisicao.url,
        status: resposta.statusCode,
        duracaoMs: Date.now() - inicio,
        requisicaoId,
      };

      if (evento === 'abortado') {
        this.logger.warn(registro);
      } else if (registro.status >= 500) {
        this.logger.error(registro);
      } else if (registro.status >= 400) {
        this.logger.warn(registro);
      } else {
        this.logger.log(registro);
      }
    };

    resposta.on('finish', () => registrar('enviado'));
    resposta.on('close', () => registrar('abortado'));

    return proximo.handle();
  }

  private obterId(requisicao: Request): string {
    const remetente = requisicao.headers['x-request-id'];
    if (typeof remetente === 'string' && ID_REMETENTE.test(remetente)) {
      return remetente;
    }
    return randomUUID();
  }
}
