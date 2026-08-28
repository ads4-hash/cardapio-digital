import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

import { environment } from '../environment';

// Interface representando a entidade do Categoria
export interface Categoria {
  id: string;
  nome: string;
  visivel?: boolean;
  produtos?: Produto[];
}

// Interface representando o vínculo de um ingrediente a um produto
export interface ProdutoIngrediente {
  id?: string;
  precoAdicional: number;
  ingredienteId: string;
  ingrediente?: Ingrediente;
}

// Interface representando a entidade do Ingrediente
export interface Ingrediente {
  id: string;
  nome: string;
  produtos?: ProdutoIngrediente[];
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
  ingredientes?: ProdutoIngrediente[];
}

// Retorna a URL completa de uma imagem (a API devolve caminhos relativos como /uploads/...)
export function resolverImagemUrl(imagemUrl?: string): string | undefined {
  if (!imagemUrl) return undefined;
  return imagemUrl.startsWith('/') ? `${environment.apiUrl}${imagemUrl}` : imagemUrl;
}

// Filtra produtos por categoria e termo de busca (lógica compartilhada entre as telas)
export function filtrarProdutos(
  produtos: Produto[],
  categoriaFiltro: string,
  buscaFiltro: string,
): Produto[] {
  const busca = buscaFiltro.trim().toLowerCase();
  return produtos.filter((p) => {
    const combinaCategoria =
      categoriaFiltro === 'todas' || p.categoriaId === categoriaFiltro;
    const combinaBusca =
      busca === '' ||
      p.nome.toLowerCase().includes(busca) ||
      (p.descricao?.toLowerCase().includes(busca) ?? false);
    return combinaCategoria && combinaBusca;
  });
}

@Injectable({
  providedIn: 'root',
})
export class ProdutoService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly API_URL = `${environment.apiUrl}/produtos`;
  private readonly CATEGORIAS_URL = `${environment.apiUrl}/categorias`;
  private readonly INGREDIENTES_URL = `${environment.apiUrl}/ingredientes`;
  private readonly UPLOAD_URL = `${environment.apiUrl}/upload`;

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
    // Evita chamadas HTTP durante o SSR/prerender (raio do cliente executa após a hidratação)
    if (isPlatformServer(this.platformId)) return;
    if (this.categoriasEmVoo) return;
    if (!force && this.categorias().length > 0) return;

    this.categoriasEmVoo = true;
    this.carregandoCategorias.set(true);

    if (force) this.categoriasCache$ = undefined;
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
    if (isPlatformServer(this.platformId)) return;
    if (this.produtosEmVoo) return;
    if (!force && this.produtos().length > 0) return;

    this.produtosEmVoo = true;
    this.carregandoProdutos.set(true);

    if (force) this.produtosCache$ = undefined;
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
    this.loadProdutos(true);
  }

  // Recarrega as categorias ignorando o cache (usado após cadastrar/editar/remover)
  recarregarCategorias(): void {
    this.loadCategorias(true);
  }

  // Categorias visíveis ao cliente
  private categoriasVisiveis = signal<Categoria[]>([]);

  // Retorna as categorias visíveis ao cliente
  categoriasVisiveisParaCliente(): Categoria[] {
    return this.categoriasVisiveis();
  }

  // Carrega as categorias visíveis ao cliente (GET /categorias?somenteVisiveis=true)
  loadCategoriasVisiveis(): void {
    if (isPlatformServer(this.platformId)) return;
    this.listarCategoriasVisiveis().subscribe({
      next: (dados) => this.categoriasVisiveis.set(dados),
      error: (err) => console.error('Erro ao carregar categorias visíveis:', err),
    });
  }

  // Buscar todos os produtos (GET /produtos)
  listar(): Observable<Produto[]> {
    return this.http.get<Produto[]>(this.API_URL);
  }

  // Buscar todas as categorias (GET /categorias)
  listarCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.CATEGORIAS_URL);
  }

  // Buscar apenas categorias visíveis para o cliente (GET /categorias?somenteVisiveis=true)
  listarCategoriasVisiveis(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.CATEGORIAS_URL}?somenteVisiveis=true`);
  }

  // Criar categoria (POST /categorias)
  criarCategoria(dados: { nome: string; visivel?: boolean }): Observable<Categoria> {
    return this.http.post<Categoria>(this.CATEGORIAS_URL, dados);
  }

  // Atualizar categoria (PATCH /categorias/:id)
  atualizarCategoria(
    id: string,
    dados: { nome?: string; visivel?: boolean },
  ): Observable<Categoria> {
    return this.http.patch<Categoria>(`${this.CATEGORIAS_URL}/${id}`, dados);
  }

  // Deletar categoria (DELETE /categorias/:id)
  excluirCategoria(id: string): Observable<void> {
    return this.http.delete<void>(`${this.CATEGORIAS_URL}/${id}`);
  }

  // Buscar todos os ingredientes (GET /ingredientes)
  listarIngredientes(): Observable<Ingrediente[]> {
    return this.http.get<Ingrediente[]>(this.INGREDIENTES_URL);
  }

  // Criar ingrediente (POST /ingredientes)
  criarIngrediente(dados: { nome: string }): Observable<Ingrediente> {
    return this.http.post<Ingrediente>(this.INGREDIENTES_URL, dados);
  }

  // Atualizar ingrediente (PATCH /ingredientes/:id)
  atualizarIngrediente(id: string, dados: { nome?: string }): Observable<Ingrediente> {
    return this.http.patch<Ingrediente>(`${this.INGREDIENTES_URL}/${id}`, dados);
  }

  // Deletar ingrediente (DELETE /ingredientes/:id)
  excluirIngrediente(id: string): Observable<void> {
    return this.http.delete<void>(`${this.INGREDIENTES_URL}/${id}`);
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

  // Envia uma imagem e retorna a URL relativa salva na API (POST /upload)
  uploadImagem(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<{ url: string }>(this.UPLOAD_URL, formData);
  }
}