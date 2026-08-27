import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

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

  // Sinais de carregamento compartilhados
  carregandoProdutos = signal(false);
  carregandoCategorias = signal(false);

  // Cache com compartilhamento entre vários assinantes
  private produtosCache$?: Observable<Produto[]>;
  private categoriasCache$?: Observable<Categoria[]>;

  private categoriasEmVoo = false;
  private produtosEmVoo = false;

  // Carrega categorias uma única vez e reutiliza o resultado em cache
  loadCategorias(force = false): void {
    if (this.categoriasEmVoo) return;
    if (!force && this.categorias().length > 0) return;

    this.categoriasEmVoo = true;
    this.carregandoCategorias.set(true);

    this.categoriasCache$ ??= this.listarCategorias().pipe(shareReplay(1));
    this.categoriasCache$.subscribe({
      next: (dados) => this.categorias.set(dados),
      error: (err) => console.error('Erro ao carregar categorias:', err),
      complete: () => {
        this.categoriasEmVoo = false;
        this.carregandoCategorias.set(false);
      },
    });
  }

  // Carrega produtos; se já carregados, apenas retorna sem nova chamada
  loadProdutos(force = false): void {
    if (this.produtosEmVoo) return;
    if (!force && this.produtos().length > 0) return;

    this.produtosEmVoo = true;
    this.carregandoProdutos.set(true);

    this.produtosCache$ ??= this.listar().pipe(shareReplay(1));
    this.produtosCache$.subscribe({
      next: (dados) => this.produtos.set(dados),
      error: (err) => console.error('Erro ao carregar produtos:', err),
      complete: () => {
        this.produtosEmVoo = false;
        this.carregandoProdutos.set(false);
      },
    });
  }

  // Recarrega ignorando o cache (usado após cadastrar/remover)
  recarregarProdutos(): void {
    this.produtosCache$ = undefined;
    this.produtosEmVoo = false;
    this.loadProdutos(true);
  }

  // Buscar todos os produtos (GET /produtos)
  listar(): Observable<Produto[]> {
    return this.http.get<Produto[]>(this.API_URL);
  }

  // Buscar todos as categorias (GET /categorias)
  listarCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.CATEGORIAS_URL);
  }

  // Buscar produto por ID (GET /produtos/:id)
  buscarPorId(id: string): Observable<Produto> {
    return this.http.get<Produto>(`${this.API_URL}/${id}`);
  }

  // Criar novo produto (POST /produtos)
  criar(produto: Produto): Observable<Produto> {
    return this.http.post<Produto>(this.API_URL, produto);
  }

  // Atualizar produto existente (PATCH /produtos/:id)
  atualizar(id: string, produto: Partial<Produto>): Observable<Produto> {
    return this.http.patch<Produto>(`${this.API_URL}/${id}`, produto);
  }

  // Deletar produto (DELETE /produtos/:id)
  excluir(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}
