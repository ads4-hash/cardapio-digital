import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../environment';
import { Produto } from './produto.service';

export type PedidoStatus = 'PENDENTE' | 'EM_PREPARO' | 'CONCLUIDO' | 'CANCELADO';

export interface ItemPedido {
  id: string;
  quantidade: number;
  preco: number;
  removidos: string;
  adicionados: string;
  produtoId: string;
  produto: Produto;
}

export interface Pedido {
  id: string;
  cliente: string;
  mesa?: string | null;
  status: PedidoStatus;
  total: number;
  createdAt: string;
  updatedAt: string;
  itens: ItemPedido[];
}

export interface CreatePedido {
  cliente: string;
  mesa?: string;
  itens: {
    produtoId: string;
    quantidade: number;
    removidos?: string[];
    adicionados?: string[];
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
}