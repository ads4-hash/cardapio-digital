import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ItemPedidoDto {
  /**
   * Produto pedido, no formato UUID.
   * @example f3a4b5c6-d7e8-4f90-a012-3c4d5e6f7081
   */
  @IsString()
  @IsNotEmpty({ message: 'O produto do item é obrigatório.' })
  produtoId: string;

  /**
   * Quantas unidades deste produto (1 a 99).
   * @example 2
   */
  @Type(() => Number)
  @IsInt({ message: 'A quantidade deve ser um número inteiro.' })
  @Min(1, { message: 'A quantidade deve ser ao menos 1.' })
  @Max(99, { message: 'A quantidade de um item não pode passar de 99.' })
  quantidade: number;

  /**
   * `ingredienteId` dos ingredientes que o cliente retirou do item. Serve só
   * para o comanda da cozinha — não altera o preço cobrado.
   * @example ["e2f3a4b5-c6d7-4e8f-9a01-2b3c4d5e6f70"]
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(200)
  @MaxLength(64, {
    each: true,
    message: 'Identificador de ingrediente removido inválido.',
  })
  removidos?: string[];

  /**
   * `ingredienteId` dos ingredientes somados ao produto. Cada um precisa
   * estar ligado ao produto com `precoAdicional` no cadastro — o valor é
   * somado ao preço unitário.
   * @example ["d1e2f3a4-b5c6-4d7e-8f90-1a2b3c4d5e6f"]
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(1000, {
    message: 'Um item do pedido não pode ter mais de 1000 porções somadas.',
  })
  @MaxLength(64, {
    each: true,
    message: 'Identificador de ingrediente adicionado inválido.',
  })
  adicionados?: string[];
}

// Formas de recebimento do pedido do estabelecimento
export enum TipoEntrega {
  RETIRADA = 'RETIRADA',
  ENTREGA = 'ENTREGA',
}

// Métodos de pagamento aceitos pelo estabelecimento
export enum FormaPagamento {
  DINHEIRO = 'DINHEIRO',
  PIX = 'PIX',
  CARTAO = 'CARTAO',
}

export class CreatePedidoDto {
  /**
   * Slug do estabelecimento (da URL /cardapio/:slug) ao qual o pedido pertence.
   * @example pizzaria-do-ze
   */
  @IsString()
  @IsNotEmpty({ message: 'Informe o estabelecimento.' })
  @MaxLength(80, {
    message: 'O estabelecimento informado é inválido.',
  })
  slug: string;

  /**
   * Nome de quem fez o pedido, como aparece no painel.
   * @example João da Silva
   */
  @IsString()
  @IsNotEmpty({ message: 'O nome do cliente é obrigatório.' })
  @MaxLength(80, {
    message: 'O nome do cliente deve ter no máximo 80 caracteres.',
  })
  cliente: string;

  /**
   * `RETIRADA` o cliente busca no balcão; `ENTREGA` o estabelecimento leva.
   * @example ENTREGA
   */
  @IsString()
  @IsIn([TipoEntrega.RETIRADA, TipoEntrega.ENTREGA], {
    message: 'Informe se o pedido é retirada ou entrega.',
  })
  tipoEntrega: TipoEntrega;

  /**
   * Contato solicitado no checkout (retirada ou entrega).
   * @example (11) 98888-7777
   */
  @IsString()
  @IsNotEmpty({ message: 'Informe um telefone para contato.' })
  @MaxLength(20, {
    message: 'O telefone deve ter no máximo 20 caracteres.',
  })
  telefone: string;

  /**
   * Endereço exigido quando o pedido é entrega. Omitir em pedidos de retirada.
   * @example Rua das Flores, 120 - Centro
   */
  @IsOptional()
  @IsString()
  @MaxLength(200, {
    message: 'O endereço deve ter no máximo 200 caracteres.',
  })
  endereco?: string;

  /**
   * Forma de pagamento escolhida no checkout (padrão: dinheiro).
   * @example PIX
   */
  @IsOptional()
  @IsIn([FormaPagamento.DINHEIRO, FormaPagamento.PIX, FormaPagamento.CARTAO], {
    message: 'Informe uma forma de pagamento válida.',
  })
  formaPagamento?: FormaPagamento;

  /**
   * Valor em dinheiro entregue para receber troco (apenas quando DINHEIRO).
   * O troco em si é calculado pelo servidor: trocoPara - total.
   * @example 50
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Informe um valor de troco válido.' },
  )
  @Min(0.01, { message: 'O valor do troco deve ser maior que zero.' })
  trocoPara?: number;

  /**
   * Itens do pedido, de 1 a 50.
   */
  @IsArray()
  @ArrayMinSize(1, { message: 'O pedido precisa conter pelo menos um item.' })
  @ArrayMaxSize(50, { message: 'O pedido não pode ter mais de 50 itens.' })
  @ValidateNested({ each: true })
  @Type(() => ItemPedidoDto)
  itens: ItemPedidoDto[];
}
