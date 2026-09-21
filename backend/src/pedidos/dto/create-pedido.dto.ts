import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
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
  @Max(99, { message: 'A quantidade de um item não pode passar de 99.' })
  quantidade: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  removidos?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  adicionados?: string[];
}

// Formas de recebimento do pedido do estabelecimento
export enum TipoEntrega {
  RETIRADA = 'RETIRADA',
  ENTREGA = 'ENTREGA',
}

export class CreatePedidoDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome do cliente é obrigatório.' })
  @MaxLength(80, {
    message: 'O nome do cliente deve ter no máximo 80 caracteres.',
  })
  cliente: string;

  @IsString()
  @IsIn([TipoEntrega.RETIRADA, TipoEntrega.ENTREGA], {
    message: 'Informe se o pedido é retirada ou entrega.',
  })
  tipoEntrega: TipoEntrega;

  // Contato solicitado no checkout (retirada ou entrega)
  @IsString()
  @IsNotEmpty({ message: 'Informe um telefone para contato.' })
  @MaxLength(20, {
    message: 'O telefone deve ter no máximo 20 caracteres.',
  })
  telefone: string;

  // Endereço exigido quando o pedido é entrega
  @IsOptional()
  @IsString()
  @MaxLength(200, {
    message: 'O endereço deve ter no máximo 200 caracteres.',
  })
  endereco?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'O pedido precisa conter pelo menos um item.' })
  @ArrayMaxSize(50, { message: 'O pedido não pode ter mais de 50 itens.' })
  @ValidateNested({ each: true })
  @Type(() => ItemPedidoDto)
  itens: ItemPedidoDto[];
}
