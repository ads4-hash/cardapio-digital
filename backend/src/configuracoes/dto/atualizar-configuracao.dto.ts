import { IsBoolean } from 'class-validator';

export class AtualizarConfiguracaoDto {
  // True libera novos pedidos no cardápio; false os suspende
  @IsBoolean({
    message: 'Informe se o estabelecimento está aceitando pedidos.',
  })
  aceitandoPedidos!: boolean;
}
