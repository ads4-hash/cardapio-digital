import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';
import { PedidoService } from '../../services/pedidos.service';

type Etapa = 'carrinho' | 'checkout' | 'sucesso';

@Component({
  selector: 'app-carrinho-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Botão Flutuante -->
    <button class="cart-float-btn" (click)="isOpen.set(true)">
      🛒 Ver Carrinho ({{ cartService.totalItems() }}) - {{ cartService.totalPrice() | currency:'BRL' }}
    </button>

    <!-- Painel Lateral (Drawer) -->
    @if (isOpen()) {
      <div class="overlay" (click)="fechar()"></div>
      <div class="drawer">
        <div class="drawer-header">
          <h2>{{ etapa() === 'sucesso' ? 'Pedido Confirmado' : 'Seu Pedido' }}</h2>
          <button (click)="fechar()">✕</button>
        </div>

        @if (etapa() === 'sucesso') {
          <div class="drawer-body success">
            <p class="success-icon">✅</p>
            <p><strong>Pedido recebido com sucesso!</strong></p>
            <p>Muito obrigado! O número do seu pedido é <strong>#{{ pedidoSucesso() }}</strong>.</p>
          </div>
          <div class="drawer-footer">
            <button class="btn-checkout" (click)="fechar()">Fechar</button>
          </div>
        } @else if (etapa() === 'checkout') {
          <div class="drawer-body">
            @if (erro()) {
              <p class="erro">{{ erro() }}</p>
            }
            <label for="cliente">Seu nome <span class="req">*</span></label>
            <input
              id="cliente"
              type="text"
              [ngModel]="cliente()"
              (ngModelChange)="cliente.set($event)"
              placeholder="Ex: João"
            />
            <label for="mesa">Mesa (opcional)</label>
            <input
              id="mesa"
              type="text"
              [ngModel]="mesa()"
              (ngModelChange)="mesa.set($event)"
              placeholder="Ex: 12"
            />
          </div>
          <div class="drawer-footer">
            <h3>Total: {{ cartService.totalPrice() | currency:'BRL' }}</h3>
            <button class="btn-checkout" [disabled]="enviando()" (click)="confirmarPedido()">
              {{ enviando() ? 'Enviando...' : 'Confirmar Pedido' }}
            </button>
            <button class="btn-cancel" (click)="voltar()">Voltar ao carrinho</button>
          </div>
        } @else {
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
            <button [disabled]="cartService.items().length === 0" class="btn-checkout" (click)="irParaCheckout()">
              Avançar para Checkout
            </button>
          </div>
        }
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
    .drawer-body label { display: block; font-weight: bold; margin: 12px 0 4px; font-size: 0.9rem; }
    .drawer-body input { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box; }
    .btn-checkout { width: 100%; padding: 12px; background: #ff4757; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 8px; }
    .btn-checkout:disabled { background: #ccc; }
    .btn-cancel { width: 100%; padding: 12px; background: #7f8c8d; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 8px; }
    .erro { background: #fdecea; color: #c0392b; padding: 10px; border-radius: 6px; font-size: 0.9rem; }
    .req { color: #ff4757; }
    .success { text-align: center; }
    .success-icon { font-size: 3rem; margin: 24px 0 8px; }
  `]
})
export class CarrinhoDrawerComponent {
  cartService = inject(CartService);
  private readonly pedidoService = inject(PedidoService);

  isOpen = signal<boolean>(false);
  erro = signal<string | null>(null);
  etapa = signal<Etapa>('carrinho');
  cliente = signal<string>('');
  mesa = signal<string>('');
  enviando = signal(false);
  pedidoSucesso = signal<string>('');

  irParaCheckout(): void {
    this.erro.set(null);
    this.etapa.set('checkout');
  }

  voltar(): void {
    this.erro.set(null);
    this.etapa.set('carrinho');
  }

  confirmarPedido(): void {
    if (!this.cliente().trim()) {
      this.erro.set('Informe seu nome para continuar.');
      return;
    }

    if (this.cartService.items().length === 0) return;

    this.enviando.set(true);
    this.erro.set(null);

    const itens = this.cartService.items().map((item) => ({
      produtoId: item.produto.id!,
      quantidade: item.quantidade,
    }));

    this.pedidoService
      .criar({
        cliente: this.cliente().trim(),
        mesa: this.mesa().trim() || undefined,
        itens,
      })
      .subscribe({
        next: (pedido) => {
          this.pedidoSucesso.set(pedido.id.slice(0, 8).toUpperCase());
          this.cartService.clear();
          this.enviando.set(false);
          this.etapa.set('sucesso');
        },
        error: (err) => {
          console.error('Erro ao gravar pedido:', err);
          this.enviando.set(false);
          this.erro.set('Não foi possível enviar o pedido. Tente novamente.');
        },
      });
  }

  fechar(): void {
    this.isOpen.set(false);
    this.etapa.set('carrinho');
    this.cliente.set('');
    this.mesa.set('');
    this.erro.set(null);
    this.pedidoSucesso.set('');
  }
}