import type { Produto } from './produto';

export type PedidoStatus =
  | 'PENDENTE'
  | 'EM_PREPARO'
  | 'EM_ROTA'
  | 'PRONTO'
  | 'CONCLUIDO'
  | 'CANCELADO';

export type TipoEntrega = 'RETIRADA' | 'ENTREGA' | 'MESA';

export type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO';

/**
 * Item de um pedido na visão do admin (`GET /pedidos`). `removidos` e
 * `adicionados` vêm como string JSON (o frontend converte).
 */
export interface ItemPedido {
  id: string;
  quantidade: number;
  preco: number;
  removidos: string;
  adicionados: string;
  pedidoId: string;
  produtoId: string;
  produto: Produto;
}

/** Pedido no painel do admin. */
export interface Pedido {
  id: string;
  cliente: string;
  tipoEntrega: TipoEntrega;
  endereco: string | null;
  telefone: string | null;
  taxaEntrega: number;
  status: PedidoStatus;
  total: number;
  formaPagamento: FormaPagamento;
  trocoPara: number | null;
  origem?: string;
  numeroMesa?: number | null;
  mesaId?: string | null;
  comandaId?: string | null;
  estabelecimentoId: string;
  itens: ItemPedido[];
  createdAt: string;
  updatedAt: string;
}

/** Item do pedido no acompanhamento público (personalização já em lista). */
export interface ItemPedidoRastreio {
  nome: string;
  quantidade: number;
  preco: number;
  removidos: string[];
  adicionados: string[];
}

/**
 * Acompanhamento público (`GET /pedidos/:id/rastrear`). Endpoint sem autenticação
 * acessível a quem tiver o id (UUID): por isso NÃO expõe dados pessoais do
 * cliente (nome, telefone, endereço) nem forma de pagamento/troco — só o que é
 * necessário para acompanhar o pedido.
 */
export interface PedidoRastreio {
  id: string;
  slug: string;
  status: PedidoStatus;
  tipoEntrega: TipoEntrega;
  taxaEntrega: number;
  total: number;
  criadoEm: string;
  itens: ItemPedidoRastreio[];
}

/** Item no payload de `POST /pedidos` (grupo por id do ingrediente). */
export interface ItemPedidoParaCriar {
  produtoId: string;
  quantidade: number;
  removidos?: string[];
  adicionados?: string[];
}

/** Payload de `POST /pedidos`. */
export interface CreatePedido {
  slug: string;
  cliente: string;
  tipoEntrega: TipoEntrega;
  telefone?: string;
  endereco?: string;
  formaPagamento?: FormaPagamento;
  trocoPara?: number;
  mesaId?: string;
  numeroMesa?: number;
  itens: ItemPedidoParaCriar[];
}
