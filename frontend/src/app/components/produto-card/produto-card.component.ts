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
    .card { border: 1px solid #eee; border-radius: 10px; overflow: hidden; background: white; box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
    .card-img { width: 100%; height: 140px; object-fit: cover; }
    .card-body { padding: 12px; }
    .card-body h3 { margin: 0 0 6px; font-size: 1.05rem; }
    .desc { margin: 0 0 10px; color: #777; font-size: 0.85rem; }
    .card-footer { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .price { font-weight: bold; color: #28a745; }
    .admin-actions { display: flex; gap: 6px; }
    .btn-add { padding: 8px 14px; background: #ff4757; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
    .btn-edit { padding: 8px 12px; background: #3498db; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
    .btn-remove { padding: 8px 12px; background: #e74c3c; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
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
