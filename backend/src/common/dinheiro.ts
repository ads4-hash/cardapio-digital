import { Prisma } from '@prisma/client';

/**
 * Converte um valor monetário (`number`, `string` ou `Prisma.Decimal`) para
 * centavos inteiros.
 *
 * Somar preços em ponto flutuante acumula erro binário (`0.1 + 0.2` vira
 * `0.30000000000000004`), e esse ruído era gravado no campo `Decimal` — que
 * existe justamente para não passar por float. Efetuar toda a aritmética em
 * centavos evita isso; o arredondamento aqui também neutraliza o ruído que já
 * venha de um `number` (ex.: `28.9 * 100` dá `2889.9999999999995`).
 */
export function paraCentavos(valor: number | string | Prisma.Decimal): number {
  const numero = Number(valor.toString());
  if (!Number.isFinite(numero)) return 0;
  return Math.round(numero * 100);
}

/** Volta de centavos inteiros para o `number` com 2 casas usado na API/DB. */
export function deCentavos(centavos: number): number {
  return Math.round(centavos) / 100;
}
