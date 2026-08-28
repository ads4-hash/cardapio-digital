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
    .cardapio .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 20px;
    }
    .cardapio p {
      text-align: center;
      color: var(--text-muted, #6b7280);
      background: var(--card, #fff);
      border-radius: var(--radius, 14px);
      padding: 48px 20px;
      box-shadow: var(--shadow-sm);
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
