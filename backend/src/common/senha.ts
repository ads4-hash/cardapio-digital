import { applyDecorators } from '@nestjs/common';
import { Matches, MinLength } from 'class-validator';

export const SENHA_MENSAGEM =
  'A senha deve ter pelo menos 6 caracteres, com letras e números.';

/**
 * Política mínima de senha usada em registro, troca e redefinição: exige
 * comprimento e, no mínimo, uma letra + um número. Não depende só do tamanho —
 * "123456" ou "abcdef" não passam mais.
 */
export function SenhaForte(): PropertyDecorator {
  return applyDecorators(
    Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, { message: SENHA_MENSAGEM }),
    MinLength(6, { message: SENHA_MENSAGEM }),
  );
}
