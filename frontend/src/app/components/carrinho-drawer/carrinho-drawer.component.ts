import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService, ItemIngrediente } from '../../services/cart.service';
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
              @for (item of cartService.items(); track item.uid) {
                <div class="cart-item">
                  <div class="cart-item-info">
                    <strong>{{ item.produto.nome }}</strong>
                    <p class="item-preco">{{ item.precoUnitario | currency:'BRL' }}</p>
                    @if (item.personalizacao.removidos.length > 0) {
                      <p class="pers">
                        Sem: {{ nomesIngredientes(item.personalizacao.removidos) }}
                      </p>
                    }
                    @if (item.personalizacao.adicionados.length > 0) {
                      <p class="pers extra">
                        + {{ item.personalizacao.adicionados.map(a => a.nome).join(', ') }}
                      </p>
                    }
                  </div>
                  <div class="controls">
                    <button (click)="cartService.updateQuantity(item.uid, item.quantidade - 1)">-</button>
                    <span>{{ item.quantidade }}</span>
                    <button (click)="cartService.updateQuantity(item.uid, item.quantidade + 1)">+</button>
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
    .cart-float-btn { position: fixed; bottom: 22px; right: 22px; background: linear-gradient(135deg, var(--accent, #22c55e), var(--accent-dark, #16a34a)); color: white; border: none; padding: 15px 24px; border-radius: 999px; font-weight: 600; font-size: 1rem; cursor: pointer; box-shadow: 0 8px 22px rgba(34,197,94,0.4); z-index: 100; transition: transform 0.15s, box-shadow 0.15s; }
    .cart-float-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 26px rgba(34,197,94,0.5); }
    .cart-float-btn:active { transform: scale(0.97); }
    .overlay { position: fixed; inset: 0; background: rgba(17,24,39,0.5); backdrop-filter: blur(2px); z-index: 101; }
    .drawer { position: fixed; top: 0; right: 0; width: 340px; max-width: 92vw; height: 100%; background: var(--card, #fff); z-index: 102; display: flex; flex-direction: column; padding: 18px; box-shadow: -4px 0 24px rgba(0,0,0,0.12); animation: slideIn 0.22s ease; }
    @keyframes slideIn { from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .drawer-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border, #eee); padding-bottom: 12px; }
    .drawer-header h2 { margin: 0; font-size: 1.15rem; }
    .drawer-header button { border: none; background: #f1f2f4; width: 30px; height: 30px; border-radius: 999px; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-muted, #6b7280); transition: background 0.15s; }
    .drawer-header button:hover { background: #e4e5e8; }
    .drawer-body { flex: 1; overflow-y: auto; padding: 16px 0; }
    .cart-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border: 1px solid var(--border, #f0f0f0); border-radius: 12px; padding: 12px; }
    .cart-item-info { flex: 1; margin-right: 10px; }
    .controls { display: flex; align-items: center; gap: 8px; }
    .controls button { width: 26px; height: 26px; border: none; border-radius: 7px; background: #ececf1; cursor: pointer; font-weight: 700; color: var(--text, #1f2937); transition: background 0.15s; }
    .controls button:hover { background: #dedfe4; }
    .controls span { min-width: 20px; text-align: center; font-weight: 600; }
    .pers { font-size: 0.8rem; color: var(--text-muted, #6b7280); margin: 2px 0; }
    .pers.extra { color: var(--accent-dark, #16a34a); }
    .drawer-body label { display: block; font-weight: 600; margin: 14px 0 5px; font-size: 0.9rem; color: var(--text, #1f2937); }
    .drawer-body input { width: 100%; padding: 12px; border: 1px solid var(--border, #e5e7eb); border-radius: 10px; box-sizing: border-box; font-size: 0.95rem; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
    .drawer-body input:focus { border-color: var(--primary, #ff4757); box-shadow: 0 0 0 3px rgba(255,71,87,0.12); }
    .btn-checkout { width: 100%; padding: 13px; background: var(--primary, #ff4757); color: white; border: none; border-radius: 11px; font-weight: 600; cursor: pointer; margin-top: 8px; transition: filter 0.15s, transform 0.1s; }
    .btn-checkout:hover:not(:disabled) { filter: brightness(1.06); }
    .btn-checkout:disabled { background: #d1d5db; cursor: not-allowed; }
    .btn-cancel { width: 100%; padding: 13px; background: #fff; color: var(--text-muted, #6b7280); border: 1px solid var(--border, #e5e7eb); border-radius: 11px; font-weight: 600; cursor: pointer; margin-top: 8px; transition: background 0.15s; }
    .btn-cancel:hover { background: #f4f5f7; }
    .erro { background: var(--primary-light, #fdecea); color: #dc2626; padding: 11px; border-radius: 10px; font-size: 0.9rem; }
    .req { color: #ef4444; }
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

  nomesIngredientes(lista: ItemIngrediente[]): string {
    return lista.map((i) => i.nome).join(', ');
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
      removidos: item.personalizacao.removidos.map((r) => r.ingredienteId),
      adicionados: item.personalizacao.adicionados.map((a) => a.ingredienteId),
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