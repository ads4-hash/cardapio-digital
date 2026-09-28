import { IsIn } from 'class-validator';

export const PEDIDO_STATUS = [
  'PENDENTE',
  'EM_PREPARO',
  'EM_ROTA',
  'PRONTO',
  'CONCLUIDO',
  'CANCELADO',
] as const;

export class UpdatePedidoDto {
  /**
   * Novo estágio do pedido. O fluxo normal é PENDENTE → EM_PREPARO → EM_ROTA
   * (entrega) → PRONTO → CONCLUIDO; CANCELADO encerra a qualquer momento.
   * @example EM_PREPARO
   */
  @IsIn(PEDIDO_STATUS, {
    message:
      'Status inválido. Use PENDENTE, EM_PREPARO, EM_ROTA, PRONTO, CONCLUIDO ou CANCELADO.',
  })
  status: string;
}
