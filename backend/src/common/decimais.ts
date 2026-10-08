import { Prisma } from '@prisma/client';

/**
 * Converte `Prisma.Decimal` em `number` em toda a profundidade do objeto.
 *
 * O schema usa `Decimal` nos campos monetários (dinheiro não passa por ponto
 * flutuante), mas no JSON um `Decimal` é serializado como string (`"25.9"`).
 * O frontend faria `0 + "25.9" = "025.9"` nas somas do painel. Normalizando
 * aqui antes de responder, a API continua devolvendo número como sempre — a
 * precisão de decimal fica só no caminho do banco.
 *
 * Datas e buffers são preservados como estão.
 */
export function decimaisParaNumero<T>(valor: T): T {
  if (Prisma.Decimal.isDecimal(valor)) {
    return Number(valor) as T;
  }
  if (Array.isArray(valor)) {
    return valor.map((item: unknown) =>
      decimaisParaNumero(item),
    ) as unknown as T;
  }
  if (valor instanceof Date || Buffer.isBuffer(valor)) {
    return valor;
  }
  if (valor !== null && typeof valor === 'object') {
    const copia: Record<string, unknown> = {};
    for (const [chave, item] of Object.entries(valor)) {
      copia[chave] = decimaisParaNumero(item);
    }
    return copia as T;
  }
  return valor;
}
