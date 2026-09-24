import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MulterError } from 'multer';

interface CorpoErro {
  statusCode: number;
  erro: string;
  mensagem: string | string[];
  caminho: string;
  timestamp: string;
}

// Padroniza todas as respostas de erro da API em pt-BR e impede
// que detalhes internos (stack/pilhas) vazem para o cliente.
@Catch()
export class ErrosGlobaisFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrosGlobaisFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const corpo: CorpoErro = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      erro: 'Erro interno',
      mensagem: 'Ocorreu um erro inesperado. Tente novamente.',
      caminho: request.url,
      timestamp: new Date().toISOString(),
    };

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const corpoExcecao = exception.getResponse();

      corpo.statusCode = status;
      corpo.erro = HttpStatus[status] ?? 'Erro';

      if (typeof corpoExcecao === 'string') {
        corpo.mensagem = corpoExcecao;
      } else if (typeof corpoExcecao === 'object' && corpoExcecao !== null) {
        const body = corpoExcecao as Record<string, unknown>;
        if (typeof body.message === 'string') corpo.mensagem = body.message;
        if (Array.isArray(body.message)) corpo.mensagem = body.message;
      }

      // Throttler (rate limit) devolve texto em inglês; traduzimos aqui
      const limiteDeTentativas: number = HttpStatus.TOO_MANY_REQUESTS;
      if (status === limiteDeTentativas) {
        corpo.mensagem =
          'Muitas tentativas. Aguarde alguns segundos antes de repetir.';
      }
    } else if (exception instanceof MulterError) {
      // Erros do multer (upload): não são HttpException e quebravam com 500
      if (exception.code === 'LIMIT_FILE_SIZE') {
        corpo.statusCode = HttpStatus.PAYLOAD_TOO_LARGE;
        corpo.erro = 'Arquivo muito grande';
        corpo.mensagem = 'A imagem deve ter no máximo 5 MB.';
      } else {
        corpo.statusCode = HttpStatus.BAD_REQUEST;
        corpo.erro = 'Upload inválido';
        corpo.mensagem = 'Não foi possível processar o arquivo enviado.';
      }
    } else if (exception instanceof Error) {
      // Erros não-expectados: registra para diagnóstico, sem expor ao cliente
      this.logger.error(exception.message, exception.stack);
    }

    response.status(corpo.statusCode).json(corpo);
  }
}
