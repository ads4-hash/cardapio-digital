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
   * Novo estágio do pedido. O fluxo tem DOIS RAMOS conforme o `tipoEntrega`
   * (EM_ROTA e PRONTO são alternativas, não etapas consecutivas):
   *
   * - Retirada: PENDENTE → EM_PREPARO → PRONTO → CONCLUIDO
   * - Entrega:  PENDENTE → EM_PREPARO → EM_ROTA → CONCLUIDO
   *
   * CANCELADO encerra a partir de qualquer ponto. CONCLUIDO e CANCELADO são
   * terminais: não voltam ao fluxo (só aceitam repetir o próprio valor).
   * @example EM_PREPARO
   */
  @IsIn(PEDIDO_STATUS, {
    message:
      'Status inválido. Use PENDENTE, EM_PREPARO, EM_ROTA, PRONTO, CONCLUIDO ou CANCELADO.',
  })
  status: string;
}
