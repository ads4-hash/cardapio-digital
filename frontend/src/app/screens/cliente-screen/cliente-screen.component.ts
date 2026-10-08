import { Component, inject, OnDestroy, OnInit, effect, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ProdutoService, Produto, filtrarProdutos } from '../../services/produto.service';
import { CategoriasTabsComponent } from '../../components/categorias-tabs/categorias-tabs.component';
import { ProdutoCardComponent } from '../../components/produto-card/produto-card.component';
import { CarrinhoDrawerComponent } from '../../components/carrinho-drawer/carrinho-drawer.component';
import { ConfiguracoesService } from '../../services/configuracoes.service';
import { EstabelecimentoContextoService } from '../../services/estabelecimento-contexto.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-cliente-screen',
  standalone: true,
  imports: [CategoriasTabsComponent, ProdutoCardComponent, CarrinhoDrawerComponent],
  styleUrls: ['../../ui/cards.css'],
  template: `
    <app-categorias-tabs
      [apenasVisiveis]="true"
      (onFiltroChange)="onFiltroChange($event)"
    ></app-categorias-tabs>

    <section class="cardapio">
      @if (produtoService.carregandoProdutos()) {
        <p class="vazio vazio--lg">Carregando produtos...</p>
      } @else if (produtoService.erroCardapio()) {
        <p class="vazio vazio--lg erro">
          {{ produtoService.erroCardapio() }}
          <button type="button" class="btn-tentar" (click)="tentarDeNovo()">
            Tentar novamente
          </button>
        </p>
      } @else if (produtosFiltrados().length === 0) {
        <p class="vazio vazio--lg">Nenhum produto encontrado.</p>
      } @else {
        <div class="grid">
          @for (produto of produtosFiltrados(); track produto.id) {
            <app-produto-card [produto]="produto" modo="cliente"></app-produto-card>
          }
        </div>
      }
    </section>

    <app-carrinho-drawer></app-carrinho-drawer>
  `,
  styles: [
    `
      .cardapio .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
        gap: 20px;
      }
      @media (max-width: 560px) {
        .cardapio .grid {
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 14px;
        }
      }
      .cardapio > p {
        line-height: 1.6;
      }
      .cardapio > p.erro {
        color: var(--danger, #c0392b);
        border-color: var(--danger, #c0392b);
      }
      .cardapio .btn-tentar {
        display: block;
        margin: 16px auto 0;
        padding: 10px 22px;
        font: inherit;
        font-weight: 600;
        color: var(--text, #fff);
        background: var(--accent);
        border: none;
        border-radius: var(--radius);
        cursor: pointer;
      }
    `,
  ],
})
export class ClienteScreenComponent implements OnInit, OnDestroy {
  protected readonly produtoService = inject(ProdutoService);
  private readonly configuracoes = inject(ConfiguracoesService);
  private readonly contexto = inject(EstabelecimentoContextoService);
  private readonly route = inject(ActivatedRoute);
  private readonly cart = inject(CartService);

  categoriaFiltro = signal<string>('todas');
  buscaFiltro = signal<string>('');

  constructor() {
    // Aplica o tema configurado pelo admin no cardápio público (claro/escuro/auto)
    effect(() => {
      this.aplicarTema(this.configuracoes.visualCardapio().tema);
    });
  }

  ngOnInit(): void {
    // Troca de estabelecimento (navegação de /cardapio/a para /cardapio/b)
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) return;
      this.contexto.definirSlugPublico(slug);
      this.produtoService.erroCardapio.set(null);
      // Isola o carrinho por casa: os itens de /cardapio/a não podem
      // aparecer em /cardapio/b nem ser enviados no pedido de lá.
      this.cart.definirEstabelecimento(slug);
      this.produtoService.loadCategoriasVisiveis(slug);
      this.produtoService.loadProdutos(false, slug);
    });
  }

  ngOnDestroy(): void {
    // Sai do cardápio: volta ao tema preferido do usuário (não força mais)
    this.aplicarTema('auto');
  }

  private aplicarTema(tema: string): void {
    if (typeof document === 'undefined') return;
    const raiz = document.documentElement;
    if (tema === 'escuro') {
      raiz.setAttribute('data-theme', 'dark');
      return;
    }
    if (tema === 'claro') {
      raiz.setAttribute('data-theme', 'light');
      return;
    }
    const salvo = window.localStorage.getItem('theme');
    raiz.setAttribute('data-theme', salvo === 'dark' ? 'dark' : 'light');
  }

  produtos(): Produto[] {
    return this.produtoService.produtos();
  }

  produtosFiltrados(): Produto[] {
    // Considera apenas produtos de categorias visíveis
    const visiveis = new Set(this.produtoService.categoriasVisiveisParaCliente().map((c) => c.id));
    const produtosVisiveis = this.produtos().filter((p) => visiveis.has(p.categoriaId));
    return filtrarProdutos(produtosVisiveis, this.categoriaFiltro(), this.buscaFiltro());
  }

  onFiltroChange(filtro: { categoria: string; busca: string }): void {
    this.categoriaFiltro.set(filtro.categoria);
    this.buscaFiltro.set(filtro.busca);
  }

  // Recarrega o cardápio após um erro de conexão, sem depender do cache
  // antigo (que pode estar vazio justamente porque a carga falhou).
  tentarDeNovo(): void {
    const slug = this.contexto.slugAtual();
    if (!slug) return;
    this.produtoService.tentarNovamenteCardapio(slug);
  }
}
