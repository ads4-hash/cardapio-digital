import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ProdutoService, Produto } from '../../services/produto.service';
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
    <app-categorias-tabs (onFiltroChange)="onFiltroChange($event)"></app-categorias-tabs>

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
      gap: 16px;
    }
  `,
  ],
})
export class ClienteScreenComponent implements OnInit {
  protected readonly produtoService = inject(ProdutoService);

  categoriaFiltro = signal<string>('todas');
  buscaFiltro = signal<string>('');

  ngOnInit(): void {
    this.produtoService.loadCategorias();
    this.produtoService.loadProdutos();
  }

  produtos(): Produto[] {
    return this.produtoService.produtos();
  }

  produtosFiltrados(): Produto[] {
    const busca = this.buscaFiltro().toLowerCase();
    return this.produtos().filter((p) => {
      const combinaCategoria =
        this.categoriaFiltro() === 'todas' || p.categoriaId === this.categoriaFiltro();
      const combinaBusca =
        busca === '' ||
        p.nome.toLowerCase().includes(busca) ||
        (p.descricao?.toLowerCase().includes(busca) ?? false);
      return combinaCategoria && combinaBusca;
    });
  }

  onFiltroChange(filtro: { categoria: string; busca: string }): void {
    this.categoriaFiltro.set(filtro.categoria);
    this.buscaFiltro.set(filtro.busca);
  }
}
