import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ItemPedidoDto {
  @IsString()
  @IsNotEmpty({ message: 'O produto do item é obrigatório.' })
  produtoId: string;

  @Type(() => Number)
  @IsInt({ message: 'A quantidade deve ser um número inteiro.' })
  @Min(1, { message: 'A quantidade deve ser ao menos 1.' })
  quantidade: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  removidos?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  adicionados?: string[];
}

export class CreatePedidoDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome do cliente é obrigatório.' })
  cliente: string;

  @IsOptional()
  @IsString()
  mesa?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'O pedido precisa conter pelo menos um item.' })
  @ValidateNested({ each: true })
  @Type(() => ItemPedidoDto)
  itens: ItemPedidoDto[];
}
