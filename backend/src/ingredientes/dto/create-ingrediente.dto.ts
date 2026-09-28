import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateIngredienteDto {
  /**
   * Nome do ingrediente. É este texto que o cliente vê na lista de adicionais
   * e no pedido, então convém manter igual em todo o cardápio.
   * @example Queijo extra
   */
  @IsString()
  @IsNotEmpty({ message: 'O nome do ingrediente é obrigatório.' })
  @MaxLength(50, {
    message: 'O nome do ingrediente deve ter no máximo 50 caracteres.',
  })
  nome: string;
}

export class UpdateIngredienteDto {
  /**
   * Novo nome do ingrediente. Omitir mantém o atual.
   * @example Bacon
   */
  @IsOptional()
  @IsString()
  @MaxLength(50, {
    message: 'O nome do ingrediente deve ter no máximo 50 caracteres.',
  })
  nome?: string;
}
