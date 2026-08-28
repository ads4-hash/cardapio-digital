import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateIngredienteDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome do ingrediente é obrigatório.' })
  nome: string;
}

export class UpdateIngredienteDto {
  @IsOptional()
  @IsString()
  nome?: string;
}
