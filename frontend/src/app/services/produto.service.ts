import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Interface representando a entidade do Produto
export interface Produto {
  id?: number;
  nome: string;
  preco: number;
  categoriaId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProdutoService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:3000/produtos';

  // Buscar todos os produtos (GET /produtos)
  listar(): Observable<Produto[]> {
    return this.http.get<Produto[]>(this.API_URL);
  }

  // Buscar produto por ID (GET /produtos/:id)
  buscarPorId(id: number): Observable<Produto> {
    return this.http.get<Produto>(`${this.API_URL}/${id}`);
  }

  // Criar novo produto (POST /produtos)
  criar(produto: Produto): Observable<Produto> {
    return this.http.post<Produto>(this.API_URL, produto);
  }

  // Deletar produto (DELETE /produtos/:id)
  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}