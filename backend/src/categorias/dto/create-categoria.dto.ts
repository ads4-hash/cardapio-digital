import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCategoriaDto {
  /**
   * Nome da categoria, como aparece no cardápio do cliente.
   * @example Pizzas
   */
  @IsString()
  @IsNotEmpty({ message: 'O nome da categoria é obrigatório.' })
  @MaxLength(50, {
    message: 'O nome da categoria deve ter no máximo 50 caracteres.',
  })
  nome: string;

  /**
   * `false` esconde a categoria do cliente sem apagá-la. O padrão é `true`.
   * @example true
   */
  @IsOptional()
  @IsBoolean({ message: 'A visibilidade deve ser um valor booleano.' })
  visivel?: boolean;
}
