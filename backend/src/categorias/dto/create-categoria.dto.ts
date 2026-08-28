import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoriaDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome da categoria é obrigatório.' })
  nome: string;

  @IsOptional()
  @IsBoolean({ message: 'A visibilidade deve ser um valor booleano.' })
  visivel?: boolean;
}
