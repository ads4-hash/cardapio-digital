import { IsBoolean } from 'class-validator';

export class AtualizarConfiguracaoDto {
  /**
   * `true` libera novos pedidos no cardápio; `false` os suspende.
   * @example true
   */
  @IsBoolean({
    message: 'Informe se o estabelecimento está aceitando pedidos.',
  })
  aceitandoPedidos!: boolean;
}
