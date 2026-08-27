import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Produto } from '../../services/produto.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-produto-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card">
      @if (produto().imagemUrl) {
        <img [src]="produto().imagemUrl" alt="{{ produto().nome }}" class="card-img" />
      }
      <div class="card-body">
        <h3>{{ produto().nome }}</h3>
        @if (produto().descricao) {
          <p class="desc">{{ produto().descricao }}</p>
        }
        <div class="card-footer">
          <span class="price">{{ produto().preco | currency:'BRL' }}</span>
          <button class="btn-add" (click)="cartService.add(produto())">Adicionar</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card { border: 1px solid #eee; border-radius: 10px; overflow: hidden; background: white; box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
    .card-img { width: 100%; height: 140px; object-fit: cover; }
    .card-body { padding: 12px; }
    .card-body h3 { margin: 0 0 6px; font-size: 1.05rem; }
    .desc { margin: 0 0 10px; color: #777; font-size: 0.85rem; }
    .card-footer { display: flex; justify-content: space-between; align-items: center; }
    .price { font-weight: bold; color: #28a745; }
    .btn-add { padding: 8px 14px; background: #ff4757; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
  `]
})
export class ProdutoCardComponent {
  produto = input.required<Produto>();
  cartService = inject(CartService);
}
