import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Produto, resolverImagemUrl } from '../../services/produto.service';
import { CartService } from '../../services/cart.service';
import { PersonalizacaoProdutoComponent } from '../personalizacao-produto/personalizacao-produto.component';

@Component({
  selector: 'app-produto-card',
  standalone: true,
  imports: [CommonModule, PersonalizacaoProdutoComponent],
  template: `
    <div class="card">
      @if (produtoImagemUrl()) {
        <img [src]="produtoImagemUrl()" alt="{{ produto().nome }}" class="card-img" />
      }
      <div class="card-body">
        <h3>{{ produto().nome }}</h3>
        @if (produto().descricao) {
          <p class="desc">{{ produto().descricao }}</p>
        }
        <div class="card-footer">
          @if (modo() === 'admin') {
            <span class="price">{{ produto().preco | currency:'BRL' }}</span>
            <div class="admin-actions">
              <button class="btn-edit" (click)="editar.emit(produto())">Editar</button>
              <button class="btn-remove" (click)="remover.emit(produto().id)">Remover</button>
            </div>
          } @else {
            <span class="price">{{ produto().preco | currency:'BRL' }}</span>
            <button class="btn-add" (click)="adicionar()">Adicionar</button>
          }
        </div>
      </div>
    </div>

    @if (produtoSelecionado()) {
      <app-personalizacao-produto
        [produto]="produtoSelecionado()!"
        (fecharEvento)="fecharPersonalizacao()"
      ></app-personalizacao-produto>
    }
  `,
  styles: [`
    .card { display: flex; flex-direction: column; background: var(--card, #fff); border: 1px solid var(--border, #eee); border-radius: var(--radius, 14px); overflow: hidden; box-shadow: var(--shadow-sm); transition: transform 0.18s ease, box-shadow 0.18s ease; }
    .card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
    .card-img { width: 100%; height: 150px; object-fit: cover; display: block; }
    .card-body { display: flex; flex-direction: column; flex: 1; padding: 14px; }
    .card-body h3 { margin: 0 0 6px; font-size: 1.05rem; color: var(--text, #1f2937); }
    .desc { margin: 0 0 14px; color: var(--text-muted, #6b7280); font-size: 0.85rem; line-height: 1.4; }
    .card-footer { margin-top: auto; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .price { font-weight: 700; color: var(--accent-dark, #16a34a); font-size: 1.05rem; }
    .admin-actions { display: flex; gap: 6px; }
    .btn-add, .btn-edit, .btn-remove { padding: 8px 14px; border: none; border-radius: 9px; font-weight: 600; cursor: pointer; transition: filter 0.15s, transform 0.1s; }
    .btn-add { background: var(--primary, #ff4757); color: white; }
    .btn-edit { background: #3b82f6; color: white; }
    .btn-remove { background: #ef4444; color: white; }
    .btn-add:hover, .btn-edit:hover, .btn-remove:hover { filter: brightness(1.08); }
    .btn-add:active, .btn-edit:active, .btn-remove:active { transform: scale(0.96); }
  `]
})
export class ProdutoCardComponent {
  produto = input.required<Produto>();
  modo = input<'cliente' | 'admin'>('cliente');
  editar = output<Produto>();
  remover = output<string | undefined>();
  cartService = inject(CartService);

  produtoSelecionado = signal<Produto | null>(null);

  produtoImagemUrl(): string | undefined {
    return resolverImagemUrl(this.produto().imagemUrl);
  }

  adicionar(): void {
    // Produtos com ingredientes abrem o modal de personalização
    if (this.produto().ingredientes && this.produto().ingredientes!.length > 0) {
      this.produtoSelecionado.set(this.produto());
      return;
    }
    this.cartService.add(this.produto());
  }

  fecharPersonalizacao(): void {
    this.produtoSelecionado.set(null);
  }
}
