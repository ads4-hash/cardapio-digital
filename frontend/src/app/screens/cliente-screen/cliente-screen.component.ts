import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ProdutoService, Produto, filtrarProdutos } from '../../services/produto.service';
import { CategoriasTabsComponent } from '../../components/categorias-tabs/categorias-tabs.component';
import { ProdutoCardComponent } from '../../components/produto-card/produto-card.component';
import { CarrinhoDrawerComponent } from '../../components/carrinho-drawer/carrinho-drawer.component';

@Component({
  selector: 'app-cliente-screen',
  standalone: true,
  imports: [
    CommonModule,
    CategoriasTabsComponent,
    ProdutoCardComponent,
    CarrinhoDrawerComponent,
  ],
  template: `
    <header class="page-header">
      <h1>Nosso cardápio</h1>
      <p>Escolha seus itens favoritos, personalize e envie seu pedido.</p>
    </header>

    <app-categorias-tabs [apenasVisiveis]="true" (onFiltroChange)="onFiltroChange($event)"></app-categorias-tabs>

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
    .page-header {
      text-align: center;
      padding: 8px 0 26px;
    }
    .page-header h1 {
      margin: 0 0 6px;
      font-size: 1.6rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .page-header p {
      margin: 0;
      color: var(--text-muted);
      font-size: 0.95rem;
    }
    @media (max-width: 560px) {
      .page-header h1 { font-size: 1.35rem; }
    }
    .cardapio .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
      gap: 20px;
    }
    @media (max-width: 560px) {
      .cardapio .grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 14px; }
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
export class ClienteScreenComponent implements OnInit {
  protected readonly produtoService = inject(ProdutoService);

  categoriaFiltro = signal<string>('todas');
  buscaFiltro = signal<string>('');

  ngOnInit(): void {
    this.produtoService.loadCategoriasVisiveis();
    this.produtoService.loadProdutos();
  }

  produtos(): Produto[] {
    return this.produtoService.produtos();
  }

  produtosFiltrados(): Produto[] {
    // Considera apenas produtos de categorias visíveis
    const visiveis = new Set(
      this.produtoService.categoriasVisiveisParaCliente().map((c) => c.id),
    );
    const produtosVisiveis = this.produtos().filter((p) =>
      visiveis.has(p.categoriaId),
    );
    return filtrarProdutos(
      produtosVisiveis,
      this.categoriaFiltro(),
      this.buscaFiltro(),
    );
  }

  onFiltroChange(filtro: { categoria: string; busca: string }): void {
    this.categoriaFiltro.set(filtro.categoria);
    this.buscaFiltro.set(filtro.busca);
  }
}
