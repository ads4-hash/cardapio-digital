import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Interface representando a entidade do Categoria
export interface Categoria {
  id: string;
  nome: string;
  produtos?: Produto[];
}

// Interface representando a entidade do Produto
export interface Produto {
  id?: string;
  nome: string;
  descricao?: string;
  preco: number;
  imagemUrl?: string;
  categoriaId: string;
  categoria?: Categoria;
  categoriaNome?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProdutoService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:3000/produtos';
  private readonly CATEGORIAS_URL = 'http://localhost:3000/categorias';

  // Estado reativo consumido pelos componentes
  produtos = signal<Produto[]>([]);
  categorias = signal<Categoria[]>([]);

  // Buscar todos os produtos (GET /produtos)
  listar(): Observable<Produto[]> {
    return this.http.get<Produto[]>(this.API_URL);
  }

  // Carrega os produtos e popula o sinal
  loadProdutos(): void {
    this.listar().subscribe({
      next: (dados) => this.produtos.set(dados),
      error: (err) => console.error('Erro ao carregar produtos:', err),
    });
  }

  // Buscar todos as categorias (GET /categorias)
  listarCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.CATEGORIAS_URL);
  }

  // Carrega as categorias e popula o sinal
  loadCategorias(): void {
    this.listarCategorias().subscribe({
      next: (dados) => this.categorias.set(dados),
      error: (err) => console.error('Erro ao carregar categorias:', err),
    });
  }

  // Buscar produto por ID (GET /produtos/:id)
  buscarPorId(id: string): Observable<Produto> {
    return this.http.get<Produto>(`${this.API_URL}/${id}`);
  }

  // Criar novo produto (POST /produtos)
  criar(produto: Produto): Observable<Produto> {
    return this.http.post<Produto>(this.API_URL, produto);
  }

  // Deletar produto (DELETE /produtos/:id)
  excluir(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}