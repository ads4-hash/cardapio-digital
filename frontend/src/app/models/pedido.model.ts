import type { Produto } from './produto.model';

export type PedidoStatus =
  | 'PENDENTE'
  | 'EM_PREPARO'
  | 'EM_ROTA'
  | 'PRONTO'
  | 'CONCLUIDO'
  | 'CANCELADO';

export interface ItemPedido {
  id: string;
  quantidade: number;
  preco: number;
  removidos: string;
  adicionados: string;
  produtoId: string;
  produto: Produto;
}

export type TipoEntrega = 'RETIRADA' | 'ENTREGA';

export type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO';

export interface Pedido {
  id: string;
  cliente: string;
  tipoEntrega: TipoEntrega;
  endereco?: string | null;
  telefone?: string | null;
  taxaEntrega: number;
  status: PedidoStatus;
  total: number;
  formaPagamento: FormaPagamento;
  trocoPara: number | null;
  createdAt: string;
  updatedAt: string;
  itens: ItemPedido[];
}

export interface CreatePedido {
  slug: string;
  cliente: string;
  tipoEntrega: TipoEntrega;
  telefone: string;
  endereco?: string;
  formaPagamento: FormaPagamento;
  trocoPara?: number;
  itens: {
    produtoId: string;
    quantidade: number;
    removidos?: string[];
    adicionados?: string[];
  }[];
}

// Retorno do rastreio público (dados mínimos, sem produtos completos)
export interface PedidoRastreio {
  id: string;
  slug: string;
  status: PedidoStatus;
  cliente: string;
  tipoEntrega: TipoEntrega;
  endereco?: string | null;
  telefone?: string | null;
  taxaEntrega: number;
  total: number;
  formaPagamento: FormaPagamento;
  trocoPara: number | null;
  criadoEm: string;
  itens: {
    nome: string;
    quantidade: number;
    preco: number;
    removidos: string[];
    adicionados: string[];
  }[];
}
