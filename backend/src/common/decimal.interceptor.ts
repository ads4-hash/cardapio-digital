import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { decimaisParaNumero } from './decimais';

/**
 * Intercepta TODAS as respostas HTTP e troca `Prisma.Decimal` por `number`
 * antes do JSON. Sem isso, os campos monetários sairiam como string
 * (`"25.9"`) e quebrariam as somas do frontend.
 */
@Injectable()
export class DecimalInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    return next
      .handle()
      .pipe(map((dados: unknown) => decimaisParaNumero(dados)));
  }
}
