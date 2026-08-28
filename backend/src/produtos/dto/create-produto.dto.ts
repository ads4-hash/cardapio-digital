import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ProdutoIngredienteDto {
  @IsString()
  @IsNotEmpty({ message: 'O id do ingrediente é obrigatório.' })
  ingredienteId: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'O preço adicional deve ser um número.' })
  @Min(0, { message: 'O preço adicional não pode ser negativo.' })
  precoAdicional?: number;
}

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProdutoIngredienteDto)
  ingredientes?: ProdutoIngredienteDto[];
}
