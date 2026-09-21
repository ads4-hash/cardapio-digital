import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ProdutoService,
  Produto,
  filtrarProdutos,
} from '../../services/produto.service';
import { CategoriasTabsComponent } from '../categorias-tabs/categorias-tabs.component';
import { ProdutoCardComponent } from '../produto-card/produto-card.component';

// Listagem de produtos do admin: filtros (categoria/busca), edição e remoção
@Component({
  selector: 'app-admin-produtos',
  standalone: true,
  imports: [CommonModule, CategoriasTabsComponent, ProdutoCardComponent],
  template: `
    <section class="secao-produtos">
      <h2 class="titulo-secao">Produtos</h2>
      <app-categorias-tabs (onFiltroChange)="onFiltroChange($event)"></app-categorias-tabs>

      <div class="cardapio">
        @if (produtoService.carregandoProdutos()) {
          <p>Carregando produtos...</p>
        } @else if (produtosFiltrados().length === 0) {
          <p>Nenhum produto encontrado.</p>
        } @else {
          <div class="grid">
            @for (produto of produtosFiltrados(); track produto.id) {
              <app-produto-card
                [produto]="produto"
                modo="admin"
                (editar)="editar.emit($event)"
                (remover)="remover($event)"
              ></app-produto-card>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class AdminProdutosComponent {
  protected readonly produtoService = inject(ProdutoService);

  @Output() editar = new EventEmitter<Produto>();

  categoriaFiltro = signal<string>('todas');
  buscaFiltro = signal<string>('');

  produtosFiltrados(): Produto[] {
    return filtrarProdutos(
      this.produtoService.produtos(),
      this.categoriaFiltro(),
      this.buscaFiltro(),
    );
  }

  onFiltroChange(filtro: { categoria: string; busca: string }): void {
    this.categoriaFiltro.set(filtro.categoria);
    this.buscaFiltro.set(filtro.busca);
  }

  remover(id?: string): void {
    if (!id) return;
    if (!confirm('Deseja realmente remover este produto?')) return;

    this.produtoService.excluir(id).subscribe({
      next: () => this.produtoService.recarregarProdutos(),
      error: (err) => {
        console.error('Erro ao remover produto:', err);
        alert('Erro ao remover produto. Tente novamente.');
      },
    });
  }
}