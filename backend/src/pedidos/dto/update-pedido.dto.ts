import { IsIn } from 'class-validator';

export const PEDIDO_STATUS = [
  'PENDENTE',
  'EM_PREPARO',
  'EM_ROTA',
  'PRONTO',
  'CONCLUIDO',
  'CANCELADO',
] as const;

export type PedidoStatus = (typeof PEDIDO_STATUS)[number];

export class UpdatePedidoDto {
  @IsIn(PEDIDO_STATUS, {
    message:
      'Status inválido. Use PENDENTE, EM_PREPARO, EM_ROTA, PRONTO, CONCLUIDO ou CANCELADO.',
  })
  status: string;
}
