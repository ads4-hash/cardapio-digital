import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProdutoDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome do produto é obrigatório.' })
  nome: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'O preço deve ser um número.' })
  @Min(0, { message: 'O preço não pode ser negativo.' })
  preco: number;

  @IsOptional()
  @IsString()
  imagemUrl?: string;

  @IsString()
  @IsNotEmpty({ message: 'A categoria é obrigatória.' })
  categoriaId: string;
}
