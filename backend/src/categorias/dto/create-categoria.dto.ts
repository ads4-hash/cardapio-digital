import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCategoriaDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome da categoria é obrigatório.' })
  @MaxLength(50, {
    message: 'O nome da categoria deve ter no máximo 50 caracteres.',
  })
  nome: string;

  @IsOptional()
  @IsBoolean({ message: 'A visibilidade deve ser um valor booleano.' })
  visivel?: boolean;
}
