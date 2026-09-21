import { IsNumber, Min } from 'class-validator';

export class AtualizarTaxaEntregaDto {
  // Valor em reais cobrado em cada entrega (0 desabilita)
  @IsNumber({}, { message: 'Informe a taxa de entrega em reais.' })
  @Min(0, { message: 'A taxa de entrega não pode ser negativa.' })
  taxaEntrega!: number;
}
