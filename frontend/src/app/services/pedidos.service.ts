import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../environment';
import type {
  CreatePedido,
  FormaPagamento,
  Pedido,
  PedidoRastreio,
  PedidoStatus,
} from '../models/pedido.model';

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

export const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  CARTAO: 'Cartão',
};

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

  // Acompanhamento público: GET /pedidos/:id/rastrear
  rastrear(id: string): Observable<PedidoRastreio> {
    return this.http.get<PedidoRastreio>(
      `${this.API_URL}/${id}/rastrear`,
    );
  }
}