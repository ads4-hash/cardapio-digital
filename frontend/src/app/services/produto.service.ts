import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';

import { environment } from '../environment';
import { EstabelecimentoContextoService } from './estabelecimento-contexto.service';

// Interface representando a entidade do Categoria
export interface Categoria {
  id: string;
  nome: string;
  visivel?: boolean;
  produtos?: Produto[];
}

/**
 * Como o cliente monta o produto.
 * - `PADRAO`: todo ingrediente já vem incluso e o cliente remove ou acrescenta.
 * - `MARMITA`: nada vem incluso, o cliente monta do zero e cada grupo tem um
 *   teto de porções.
 */
export type TipoProduto = 'PADRAO' | 'MARMITA';

// Seção de escolha dentro de um produto ("Proteínas", "Acompanhamentos").
// maximoEscolhas limita quantas porções o cliente pode somar no grupo, contando
// repetição: 2 permite escolher a mesma proteína duas vezes.
export interface ProdutoGrupo {
  id?: string;
  nome: string;
  ordem?: number;
  maximoEscolhas: number;
}

// Interface representando o vínculo de um ingrediente a um produto
export interface ProdutoIngrediente {
  id?: string;
  precoAdicional: number;
  ingredienteId: string;
  ingrediente?: Ingrediente;
  // Grupo de escolha a que o ingrediente pertence. Nulo = ingrediente solto,
  // sem teto de porções.
  grupoId?: string | null;
  grupo?: ProdutoGrupo | null;
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
  imagemUrl?: string | null;
  categoriaId: string;
  categoria?: Categoria;
  categoriaNome?: string;
  tipo?: TipoProduto;
  grupos?: ProdutoGrupo[];
  ingredientes?: ProdutoIngrediente[];
}

// Payload de `POST /produtos` e `PATCH /produtos/:id`. Não é o mesmo formato
// de `Produto`: aqui o grupo de um ingrediente é o *nome* da seção, enquanto na
// resposta da API ele vem como objeto.
export interface ProdutoParaSalvar {
  nome: string;
  descricao?: string | null;
  preco: number;
  imagemUrl?: string | null;
  categoriaId: string;
  tipo?: TipoProduto;
  grupos?: { nome: string; maximoEscolhas: number }[];
  ingredientes?: {
    ingredienteId: string;
    precoAdicional: number;
    grupo?: string;
  }[];
}

// O teto de porções só vale para montagem; em produto comum o cliente apenas
// remove ou acrescenta, sem limite por seção.
export function ehMontagem(produto: Produto | null | undefined): boolean {
  return produto?.tipo === 'MARMITA';
}

// Retorna a URL completa de uma imagem (a API devolve caminhos relativos como /uploads/...)
// Usa a URL pública: o `src` é resolvido pelo browser, mesmo quando o HTML foi
// gerado pelo SSR, então precisa de um endereço alcançável pelo cliente.
export function resolverImagemUrl(imagemUrl?: string | null): string | undefined {
  if (!imagemUrl) return undefined;
  return imagemUrl.startsWith('/') ? `${environment.publicApiUrl}${imagemUrl}` : imagemUrl;
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
  private readonly contexto = inject(EstabelecimentoContextoService);
  private readonly API_URL = `${environment.apiUrl}/produtos`;
  private readonly CATEGORIAS_URL = `${environment.apiUrl}/categorias`;
  private readonly INGREDIENTES_URL = `${environment.apiUrl}/ingredientes`;
  private readonly UPLOAD_URL = `${environment.apiUrl}/upload`;

  // Estado reativo consumido pelos componentes
  produtos = signal<Produto[]>([]);
  categorias = signal<Categoria[]>([]);

  // Sinais de carregamento compartilhados
  carregandoProdutos = signal(false);

  // Erro na carga do cardápio público: a tela mostra uma mensagem com botão de
  // "tentar novamente" em vez de um branco silencioso.
  erroCardapio = signal<string | null>(null);
  readonly MENSAGEM_ERRO_CARDAPIO =
    'Não foi possível carregar o cardápio. Verifique sua conexão e tente novamente.';

  // Caches por slug (o catálogo de cada estabelecimento é independente)
  private produtosPorSlug = new Map<string, Produto[]>();
  private categoriasPorSlug = new Map<string, Categoria[]>();
  private categoriasVisiveisPorSlug = new Map<string, Categoria[]>();
  private carregando = new Set<string>();

  private defaultSlug(): string | null {
    return this.contexto.slugAtual();
  }

  // Carrega categorias do estabelecimento; reutiliza o resultado em cache
  loadCategorias(force = false, slug = this.defaultSlug() ?? ''): void {
    // Evita chamadas HTTP durante o SSR/prerender (raio do cliente executa após a hidratação)
    if (isPlatformServer(this.platformId) || !slug) return;
    const emVoo = this.carregando.has(`c:${slug}`);
    if (emVoo) return;
    if (!force && this.categoriasPorSlug.has(slug)) {
      this.categorias.set(this.categoriasPorSlug.get(slug)!);
      return;
    }

    this.carregando.add(`c:${slug}`);
    this.listarCategorias(slug).subscribe({
      next: (dados) => {
        this.categoriasPorSlug.set(slug, dados);
        this.categorias.set(dados);
      },
      error: (err) => console.error('Erro ao carregar categorias:', err),
      complete: () => {
        this.carregando.delete(`c:${slug}`);
      },
    });
  }

  // Carrega produtos do estabelecimento; se já carregados, reutiliza o cache
  loadProdutos(force = false, slug = this.defaultSlug() ?? ''): void {
    if (isPlatformServer(this.platformId) || !slug) return;
    const emVoo = this.carregando.has(`p:${slug}`);
    if (emVoo) return;
    if (!force && this.produtosPorSlug.has(slug)) {
      this.produtos.set(this.produtosPorSlug.get(slug)!);
      return;
    }

    this.carregando.add(`p:${slug}`);
    this.carregandoProdutos.set(true);
    this.erroCardapio.set(null);
    this.listar(slug).subscribe({
      next: (dados) => {
        this.produtosPorSlug.set(slug, dados);
        this.produtos.set(dados);
      },
      error: (err) => {
        console.error('Erro ao carregar produtos:', err);
        this.erroCardapio.set(this.MENSAGEM_ERRO_CARDAPIO);
      },
      complete: () => {
        this.carregando.delete(`p:${slug}`);
        this.carregandoProdutos.set(false);
      },
    });
  }

  // Recarrega ignorando o cache (usado após cadastrar/remover)
  recarregarProdutos(): void {
    this.loadProdutos(true);
  }

  // Busca fresca do catálogo direto da API (ignorando o cache usado pela
  // tela) e já resolve com a lista atual. Usado para validar o carrinho antes
  // de enviar o pedido; em caso de erro mantém a lista em memória.
  async carregarProdutosAtualizados(): Promise<Produto[]> {
    const slug = this.defaultSlug() ?? '';
    if (isPlatformServer(this.platformId)) return this.produtos();
    if (!slug) return this.produtos();
    try {
      const dados = await firstValueFrom(this.listar(slug));
      this.produtosPorSlug.set(slug, dados);
      this.produtos.set(dados);
      return dados;
    } catch (err) {
      console.error('Erro ao atualizar produtos:', err);
      return this.produtos();
    }
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

  // Carrega as categorias visíveis ao cliente (GET /categorias?slug=:slug).
  // O servidor já filtra a visibilidade para quem não é o admin do próprio
  // estabelecimento: não há parâmetro extra a enviar.
  loadCategoriasVisiveis(slug = this.defaultSlug() ?? ''): void {
    if (isPlatformServer(this.platformId) || !slug) return;

    if (this.categoriasVisiveisPorSlug.has(slug)) {
      this.categoriasVisiveis.set(this.categoriasVisiveisPorSlug.get(slug)!);
      return;
    }
    if (this.carregando.has(`cv:${slug}`)) return;
    this.carregando.add(`cv:${slug}`);
    this.erroCardapio.set(null);

    this.listarCategorias(slug).subscribe({
      next: (dados) => {
        this.categoriasVisiveisPorSlug.set(slug, dados);
        this.categoriasVisiveis.set(dados);
      },
      error: (err) => {
        console.error('Erro ao carregar categorias visíveis:', err);
        this.erroCardapio.set(this.MENSAGEM_ERRO_CARDAPIO);
      },
      complete: () => this.carregando.delete(`cv:${slug}`),
    });
  }

  // Tentar de novo após erro: limpa o estado, derruba o cache do slug e
  // recarrega produtos e categorias visíveis.
  tentarNovamenteCardapio(slug = this.defaultSlug() ?? ''): void {
    if (!slug) return;
    this.erroCardapio.set(null);
    this.produtosPorSlug.delete(slug);
    this.categoriasVisiveisPorSlug.delete(slug);
    this.loadProdutos(true, slug);
    this.loadCategoriasVisiveis(slug);
  }

  // Buscar todos os produtos (GET /produtos?slug=:slug)
  listar(slug = this.defaultSlug() ?? ''): Observable<Produto[]> {
    return this.http.get<Produto[]>(`${this.API_URL}?slug=${encodeURIComponent(slug)}`);
  }

  // Buscar todas as categorias (GET /categorias?slug=:slug)
  private listarCategorias(
    slug = this.defaultSlug() ?? '',
  ): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.CATEGORIAS_URL}?slug=${encodeURIComponent(slug)}`);
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

  // Buscar todos os ingredientes (GET /ingredientes?slug=:slug)
  listarIngredientes(slug = this.defaultSlug() ?? ''): Observable<Ingrediente[]> {
    return this.http.get<Ingrediente[]>(`${this.INGREDIENTES_URL}?slug=${encodeURIComponent(slug)}`);
  }

  // Criar ingrediente (POST /ingredientes)
  criarIngrediente(dados: { nome: string }): Observable<Ingrediente> {
    return this.http.post<Ingrediente>(this.INGREDIENTES_URL, dados);
  }

  // Deletar ingrediente (DELETE /ingredientes/:id)
  excluirIngrediente(id: string): Observable<void> {
    return this.http.delete<void>(`${this.INGREDIENTES_URL}/${id}`);
  }

  // Criar novo produto (POST /produtos)
  criar(produto: ProdutoParaSalvar): Observable<Produto> {
    return this.http.post<Produto>(this.API_URL, produto);
  }

  // Atualizar produto existente (PATCH /produtos/:id)
  atualizar(id: string, produto: ProdutoParaSalvar): Observable<Produto> {
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