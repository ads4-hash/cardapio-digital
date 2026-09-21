import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateIngredienteDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome do ingrediente é obrigatório.' })
  @MaxLength(50, {
    message: 'O nome do ingrediente deve ter no máximo 50 caracteres.',
  })
  nome: string;
}

export class UpdateIngredienteDto {
  @IsOptional()
  @IsString()
  @MaxLength(50, {
    message: 'O nome do ingrediente deve ter no máximo 50 caracteres.',
  })
  nome?: string;
}
