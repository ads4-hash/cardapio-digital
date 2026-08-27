import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-carrinho-drawer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Botão Flutuante -->
    <button class="cart-float-btn" (click)="isOpen.set(true)">
      🛒 Ver Carrinho ({{ cartService.totalItems() }}) - {{ cartService.totalPrice() | currency:'BRL' }}
    </button>

    <!-- Painel Lateral (Drawer) -->
    @if (isOpen()) {
      <div class="overlay" (click)="isOpen.set(false)"></div>
      <div class="drawer">
        <div class="drawer-header">
          <h2>Seu Pedido</h2>
          <button (click)="isOpen.set(false)">✕</button>
        </div>

        <div class="drawer-body">
          @if (cartService.items().length === 0) {
            <p>Seu carrinho está vazio.</p>
          } @else {
            @for (item of cartService.items(); track item.produto.id) {
              <div class="cart-item">
                <div>
                  <strong>{{ item.produto.nome }}</strong>
                  <p>{{ item.produto.preco | currency:'BRL' }}</p>
                </div>
                <div class="controls">
                  <button (click)="cartService.updateQuantity(item.produto.id!, item.quantidade - 1)">-</button>
                  <span>{{ item.quantidade }}</span>
                  <button (click)="cartService.updateQuantity(item.produto.id!, item.quantidade + 1)">+</button>
                </div>
              </div>
            }
          }
        </div>

        <div class="drawer-footer">
          <h3>Total: {{ cartService.totalPrice() | currency:'BRL' }}</h3>
          <button [disabled]="cartService.items().length === 0" class="btn-checkout">
            Avançar para Checkout
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .cart-float-btn { position: fixed; bottom: 20px; right: 20px; background: #2ed573; color: white; border: none; padding: 14px 24px; border-radius: 30px; font-weight: bold; font-size: 1rem; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.2); z-index: 100; }
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 101; }
    .drawer { position: fixed; top: 0; right: 0; width: 320px; height: 100%; background: white; z-index: 102; display: flex; flex-direction: column; padding: 16px; box-shadow: -2px 0 10px rgba(0,0,0,0.1); }
    .drawer-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 8px; }
    .drawer-body { flex: 1; overflow-y: auto; padding: 16px 0; }
    .cart-item { display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #f0f0f0; padding-bottom: 8px; }
    .controls { display: flex; align-items: center; gap: 8px; }
    .btn-checkout { width: 100%; padding: 12px; background: #ff4757; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
    .btn-checkout:disabled { background: #ccc; }
  `]
})
export class CarrinhoDrawerComponent {
  cartService = inject(CartService);
  isOpen = signal<boolean>(false);
}