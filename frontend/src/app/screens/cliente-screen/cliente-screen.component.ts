import { Component, inject, OnDestroy, OnInit, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { ProdutoService, Produto, filtrarProdutos } from '../../services/produto.service';
import { CategoriasTabsComponent } from '../../components/categorias-tabs/categorias-tabs.component';
import { ProdutoCardComponent } from '../../components/produto-card/produto-card.component';
import { CarrinhoDrawerComponent } from '../../components/carrinho-drawer/carrinho-drawer.component';
import { ConfiguracoesService } from '../../services/configuracoes.service';
import { EstabelecimentoContextoService } from '../../services/estabelecimento-contexto.service';

@Component({
  selector: 'app-cliente-screen',
  standalone: true,
  imports: [CommonModule, CategoriasTabsComponent, ProdutoCardComponent, CarrinhoDrawerComponent],
  template: `
    <app-categorias-tabs
      [apenasVisiveis]="true"
      (onFiltroChange)="onFiltroChange($event)"
    ></app-categorias-tabs>

    <section class="cardapio">
      @if (produtoService.carregandoProdutos()) {
        <p>Carregando produtos...</p>
      } @else if (produtosFiltrados().length === 0) {
        <p>Nenhum produto encontrado.</p>
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
        text-align: center;
        color: var(--text-muted);
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 56px 20px;
        box-shadow: var(--shadow-sm);
        line-height: 1.6;
      }
    `,
  ],
})
export class ClienteScreenComponent implements OnInit, OnDestroy {
  protected readonly produtoService = inject(ProdutoService);
  private readonly configuracoes = inject(ConfiguracoesService);
  private readonly contexto = inject(EstabelecimentoContextoService);
  private readonly route = inject(ActivatedRoute);

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
}
