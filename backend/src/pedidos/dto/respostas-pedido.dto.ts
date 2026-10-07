import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProdutoDto } from '../../produtos/dto/respostas-produto.dto';

/**
 * Item de um pedido na visão do admin (`GET /pedidos` e `GET /pedidos/:id`).
 * `removidos` e `adicionados` aqui vêm como string JSON — é o frontend quem
 * converte (o SQLite não tem array).
 *
 * Nome com sufixo `Resposta` de propósito: o DTO de entrada do mesmo item
 * (`ItemPedidoDto` em `create-pedido.dto.ts`) já existe, e o Swagger
 * indexa os schemas pelo nome da classe — nomes iguais se sobrescrevem.
 */
export class ItemPedidoRespostaDto {
  @ApiProperty({ example: 'a1b2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d' })
  id: string;

  @ApiProperty({ example: 2 })
  quantidade: number;

  @ApiProperty({
    description: 'Preço unitário cobrado (base + adicionais), em reais.',
    example: 49.9,
  })
  preco: number;

  @ApiProperty({
    description: 'Nomes dos ingredientes removidos, como string JSON.',
    example: '["cebola"]',
  })
  removidos: string;

  @ApiProperty({
    description: 'Nomes dos ingredientes adicionados, como string JSON.',
    example: '["Queijo extra"]',
  })
  adicionados: string;

  @ApiProperty({ example: 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e' })
  pedidoId: string;

  @ApiProperty({ example: 'f3a4b5c6-d7e8-4f90-a012-3c4d5e6f7081' })
  produtoId: string;

  @ApiProperty({ type: ProdutoDto })
  produto: ProdutoDto;
}

/** Pedido no painel do admin. */
export class PedidoDto {
  @ApiProperty({
    description:
      'UUID do pedido. É o que o cliente acompanha em /pedido/:id — não é adivinhável.',
    example: 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e',
  })
  id: string;

  @ApiProperty({ example: 'João da Silva' })
  cliente: string;

  @ApiProperty({
    description: 'RETIRADA ou ENTREGA.',
    enum: ['RETIRADA', 'ENTREGA'],
    example: 'ENTREGA',
  })
  tipoEntrega: string;

  @ApiProperty({
    example: 'Rua das Flores, 120 - Centro',
    nullable: true,
    type: String,
  })
  endereco: string | null;

  @ApiProperty({ example: '+5511988888888', nullable: true, type: String })
  telefone: string | null;

  @ApiProperty({ description: 'Taxa de entrega, em reais.', example: 5 })
  taxaEntrega: number;

  @ApiProperty({
    description:
      'PENDENTE, EM_PREPARO, EM_ROTA, PRONTO, CONCLUIDO ou CANCELADO.',
    enum: [
      'PENDENTE',
      'EM_PREPARO',
      'EM_ROTA',
      'PRONTO',
      'CONCLUIDO',
      'CANCELADO',
    ],
    example: 'EM_PREPARO',
  })
  status: string;

  @ApiProperty({ description: 'Total do pedido, em reais.', example: 104.8 })
  total: number;

  @ApiProperty({
    description: 'DINHEIRO, PIX ou CARTAO.',
    enum: ['DINHEIRO', 'PIX', 'CARTAO'],
    example: 'PIX',
  })
  formaPagamento: string;

  @ApiProperty({
    description:
      'Valor recebido em dinheiro, quando formaPagamento = DINHEIRO. O troco é trocoPara - total.',
    example: 150,
    nullable: true,
    type: Number,
  })
  trocoPara: number | null;

  @ApiProperty({ description: 'Estabelecimento que recebeu o pedido.' })
  estabelecimentoId: string;

  @ApiProperty({ type: [ItemPedidoRespostaDto] })
  itens: ItemPedidoRespostaDto[];

  @ApiProperty({ example: '2026-09-28T16:45:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-09-28T16:50:00.000Z' })
  updatedAt: string;
}

/**
 * Item do pedido na visão de acompanhamento: só o nome do produto e a
 * personalização, já convertida de JSON para lista.
 *
 * Declarado antes de `PedidoRastreioDto` porque o decorator `@ApiProperty`
 * é avaliado na definição da classe.
 */
export class ItemPedidoRastreioDto {
  @ApiProperty({
    description: 'Nome do produto, já copiado do produto (o ID não é exposto).',
    example: 'Pizza Margherita',
  })
  nome: string;

  @ApiProperty({ example: 2 })
  quantidade: number;

  @ApiProperty({
    description: 'Preço unitário já com os adicionais.',
    example: 49.9,
  })
  preco: number;

  @ApiProperty({
    type: [String],
    description:
      'Ingredientes removidos. Array de verdade aqui, ao contrário da visão do admin, que devolve string JSON.',
    example: ['cebola'],
  })
  removidos: string[];

  @ApiProperty({
    type: [String],
    description: 'Ingredientes adicionados pelo cliente.',
    example: ['Queijo extra'],
  })
  adicionados: string[];
}

/**
 * Acompanhamento público (`GET /pedidos/:id/rastrear`): shape mais enxuto, sem
 * o produto inteiro e com `criadoEm`. Inclui o slug do estabelecimento para o
 * cliente carregar a identidade visual do cardápio certo.
 */
export class PedidoRastreioDto {
  @ApiProperty({ example: 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e' })
  id: string;

  @ApiProperty({
    description:
      'Slug do estabelecimento, para o cliente carregar o cardápio certo.',
    example: 'pizzaria-do-ze',
  })
  slug: string;

  @ApiProperty({
    enum: [
      'PENDENTE',
      'EM_PREPARO',
      'EM_ROTA',
      'PRONTO',
      'CONCLUIDO',
      'CANCELADO',
    ],
    example: 'PRONTO',
  })
  status: string;

  @ApiProperty({ example: 'João da Silva' })
  cliente: string;

  @ApiProperty({ enum: ['RETIRADA', 'ENTREGA'], example: 'RETIRADA' })
  tipoEntrega: string;

  @ApiPropertyOptional({
    example: 'Rua das Flores, 120 - Centro',
    nullable: true,
    type: String,
  })
  endereco?: string | null;

  @ApiPropertyOptional({
    example: '+5511988888888',
    nullable: true,
    type: String,
  })
  telefone?: string | null;

  @ApiProperty({ example: 0 })
  taxaEntrega: number;

  @ApiProperty({ example: 104.8 })
  total: number;

  @ApiProperty({ enum: ['DINHEIRO', 'PIX', 'CARTAO'], example: 'DINHEIRO' })
  formaPagamento: string;

  @ApiPropertyOptional({ example: 150, nullable: true, type: Number })
  trocoPara?: number | null;

  @ApiProperty({ example: '2026-09-28T16:45:00.000Z' })
  criadoEm: string;

  @ApiProperty({
    type: [ItemPedidoRastreioDto],
    description: 'Itens achatados, com a personalização já aplicada.',
  })
  itens: ItemPedidoRastreioDto[];
}
