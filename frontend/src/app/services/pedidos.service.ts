import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../environment';
import { Produto } from './produto.service';

// Formata telefones brasileiros: (85) 9 9988-4433
export function formatarTelefone(valor: string | null | undefined): string {
  if (!valor) return '';
  const digitos = valor.replace(/\D/g, '');
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 3)} ${digitos.slice(3, 7)}-${digitos.slice(7)}`;
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return valor;
}

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

export const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  CARTAO: 'Cartão',
};

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

@Injectable({
  providedIn: 'root',
})
export class PedidoService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/pedidos`;

  listar(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(this.API_URL);
  }

  criar(dados: CreatePedido): Observable<Pedido> {
    return this.http.post<Pedido>(this.API_URL, dados);
  }

  atualizarStatus(id: string, status: PedidoStatus): Observable<Pedido> {
    return this.http.patch<Pedido>(`${this.API_URL}/${id}/status`, { status });
  }

  excluir(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }

  // Acompanhamento público: GET /pedidos/:id/rastrear
  rastrear(id: string): Observable<PedidoRastreio> {
    return this.http.get<PedidoRastreio>(
      `${this.API_URL}/${id}/rastrear`,
    );
  }
}