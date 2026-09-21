import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
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
  @MaxLength(100, {
    message: 'O nome do produto deve ter no máximo 100 caracteres.',
  })
  nome: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'A descrição deve ter no máximo 500 caracteres.' })
  descricao?: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'O preço deve ser um número.' })
  @Min(0, { message: 'O preço não pode ser negativo.' })
  preco: number;

  @IsOptional()
  @IsString()
  @Matches(/^\/uploads\/[a-zA-Z0-9._-]+$/, {
    message: 'A imagem deve ser um caminho relativo em /uploads/.',
  })
  imagemUrl?: string;

  @IsString()
  @IsNotEmpty({ message: 'A categoria é obrigatória.' })
  categoriaId: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ProdutoIngredienteDto)
  ingredientes?: ProdutoIngredienteDto[];
}
