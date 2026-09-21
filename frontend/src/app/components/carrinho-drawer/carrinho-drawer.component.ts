import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartService, ItemIngrediente } from '../../services/cart.service';
import { PedidoService, TipoEntrega } from '../../services/pedidos.service';
import { ConfiguracoesService } from '../../services/configuracoes.service';

type Etapa = 'carrinho' | 'entrega' | 'checkout' | 'sucesso';

@Component({
  selector: 'app-carrinho-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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
            <a class="btn-acompanhar" [routerLink]="['/pedido', pedidoId()]">Acompanhar pedido</a>
          </div>
          <div class="drawer-footer">
            <button class="btn-checkout" (click)="fechar()">Fechar</button>
          </div>
        } @else if (etapa() === 'entrega') {
          <div class="drawer-body">
            @if (erro()) {
              <p class="erro">{{ erro() }}</p>
            }
            <div class="entrega">
              <p class="entrega-titulo">Como deseja receber? <span class="req">*</span></p>
              <label class="opcao" [class.selecionada]="tipoEntrega() === 'RETIRADA'">
                <input
                  type="radio"
                  name="tipoEntrega"
                  [checked]="tipoEntrega() === 'RETIRADA'"
                  (change)="tipoEntrega.set('RETIRADA')"
                />
                <span class="opcao-info">
                  <strong>🏪 Retirada</strong>
                  <small>Buscar no balcão</small>
                </span>
              </label>
              <label class="opcao" [class.selecionada]="tipoEntrega() === 'ENTREGA'">
                <input
                  type="radio"
                  name="tipoEntrega"
                  [checked]="tipoEntrega() === 'ENTREGA'"
                  (change)="tipoEntrega.set('ENTREGA')"
                />
                <span class="opcao-info">
                  <strong>🚚 Entrega</strong>
                  <small>
                    Taxa:
                    {{ configuracoes.taxaEntrega() > 0 ? (taxa() | currency:'BRL') : 'Grátis' }}
                  </small>
                </span>
              </label>
            </div>
            @if (tipoEntrega() === 'ENTREGA') {
              <p class="dica-entrega">Você informará o endereço na próxima etapa.</p>
            } @else {
              <p class="dica-entrega">Você retirará o pedido no balcão.</p>
            }
          </div>
          <div class="drawer-footer">
            <p class="linha-total">Subtotal: {{ cartService.totalPrice() | currency:'BRL' }}</p>
            @if (taxa() > 0) {
              <p class="linha-total taxa">Taxa de entrega: {{ taxa() | currency:'BRL' }}</p>
            }
            <h3>Total: {{ totalComTaxa() | currency:'BRL' }}</h3>
            <button class="btn-cancel" (click)="voltar()">Voltar ao carrinho</button>
            <button class="btn-checkout" (click)="irParaCheckout()">
              Continuar para Checkout
            </button>
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
            <label for="telefone">Telefone de contato <span class="req">*</span></label>
            <input
              id="telefone"
              type="tel"
              [ngModel]="telefone()"
              (ngModelChange)="telefone.set($event)"
              placeholder="Ex: (11) 99999-9999"
            />
            @if (tipoEntrega() === 'ENTREGA') {
              <label for="endereco">Endereço de entrega <span class="req">*</span></label>
              <input
                id="endereco"
                type="text"
                [ngModel]="endereco()"
                (ngModelChange)="endereco.set($event)"
                placeholder="Rua, número, bairro"
              />
            }
          </div>
          <div class="drawer-footer">
            <p class="linha-total">Subtotal: {{ cartService.totalPrice() | currency:'BRL' }}</p>
            @if (taxa() > 0) {
              <p class="linha-total taxa">Taxa de entrega: {{ taxa() | currency:'BRL' }}</p>
            }
            <h3>Total: {{ totalComTaxa() | currency:'BRL' }}</h3>
            @if (!configuracoes.aceitandoPedidos()) {
              <p class="erro">A casa está offline no momento e não está recebendo pedidos.</p>
            }
            <button
              class="btn-checkout"
              [disabled]="enviando() || !configuracoes.aceitandoPedidos()"
              (click)="confirmarPedido()"
            >
              {{ enviando() ? 'Enviando...' : 'Confirmar Pedido' }}
            </button>
            <button class="btn-cancel" (click)="voltarCheckout()">Voltar</button>
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
            <button [disabled]="cartService.items().length === 0" class="btn-checkout" (click)="irParaEntrega()">
              Continuar
            </button>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .cart-float-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 100;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 15px 22px;
      background: linear-gradient(135deg, var(--accent), var(--accent-dark));
      color: #fff;
      border: none;
      border-radius: var(--radius-pill);
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      box-shadow: 0 10px 26px color-mix(in srgb, var(--accent) 40%, transparent);
      transition: transform var(--transition), box-shadow var(--transition), filter var(--transition);
    }
    .cart-float-btn:hover { transform: translateY(-3px); box-shadow: 0 14px 32px color-mix(in srgb, var(--accent) 50%, transparent); }
    .cart-float-btn:active { transform: translateY(-1px) scale(0.98); }
    @media (max-width: 480px) {
      .cart-float-btn { left: 16px; right: 16px; justify-content: center; padding: 14px 18px; font-size: 0.9rem; }
    }
    .overlay { position: fixed; inset: 0; background: var(--overlay); backdrop-filter: blur(3px); z-index: 101; animation: fadeIn 0.2s ease; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .drawer {
      position: fixed;
      top: 0;
      right: 0;
      width: 380px;
      max-width: 100vw;
      height: 100%;
      background: var(--card);
      z-index: 102;
      display: flex;
      flex-direction: column;
      padding: 20px;
      box-shadow: -8px 0 40px rgba(16, 24, 40, 0.18);
      animation: slideIn 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
    @media (max-width: 480px) { .drawer { width: 100%; } }
    .drawer-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; border-bottom: 1px solid var(--border); margin-bottom: 4px; }
    .drawer-header h2 { margin: 0; font-size: 1.2rem; font-weight: 800; letter-spacing: -0.01em; }
    .drawer-header button {
      border: none;
      background: var(--surface-hover);
      width: 32px;
      height: 32px;
      border-radius: var(--radius-pill);
      font-size: 0.95rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      transition: background var(--transition), color var(--transition), transform var(--transition);
    }
    .drawer-header button:hover { color: var(--danger); transform: rotate(90deg); }
    .drawer-body { flex: 1; overflow-y: auto; padding: 16px 0; }
    .cart-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 14px;
      transition: border-color var(--transition), box-shadow var(--transition);
    }
    .cart-item:hover { border-color: color-mix(in srgb, var(--primary) 25%, var(--border)); box-shadow: var(--shadow-sm); }
    .cart-item-info { flex: 1; min-width: 0; margin-right: 6px; }
    .cart-item-info strong { font-size: 0.95rem; display: block; margin-bottom: 2px; }
    .item-preco { margin: 2px 0; font-weight: 700; color: var(--accent-dark); font-size: 0.9rem; }
    .controls { display: flex; align-items: center; gap: 8px; }
    .controls button {
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 8px;
      background: var(--surface-hover);
      cursor: pointer;
      font-weight: 700;
      font-size: 1rem;
      color: var(--text);
      transition: background var(--transition), color var(--transition), transform var(--transition);
    }
    .controls button:hover { background: var(--primary-light); color: var(--primary); }
    .controls button:active { transform: scale(0.92); }
    .controls span { min-width: 20px; text-align: center; font-weight: 700; }
    .pers { font-size: 0.8rem; color: var(--text-muted); margin: 3px 0; line-height: 1.4; }
    .pers.extra { color: var(--accent-dark); font-weight: 600; }
    .entrega { margin-top: 14px; }
    .entrega-titulo { font-weight: 700; margin: 0 0 6px; font-size: 0.82rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; }
    .opcao {
      display: flex;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--border);
      border-radius: 9px;
      padding: 6px 10px;
      margin-bottom: 6px;
      cursor: pointer;
      transition: border-color var(--transition), background var(--transition), box-shadow var(--transition);
    }
    .opcao.selecionada { border-color: var(--primary); background: var(--primary-light); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent); }
    .opcao input { accent-color: var(--primary); width: 15px; height: 15px; margin: 0; }
    .opcao-info { display: flex; flex-direction: column; }
    .opcao-info strong { font-size: 0.83rem; line-height: 1.2; }
    .opcao-info small { color: var(--text-muted); font-size: 0.72rem; margin-top: 1px; line-height: 1.2; }
    .linha-total { margin: 2px 0; color: var(--text-muted); font-size: 0.9rem; }
    .linha-total.taxa { color: var(--accent-dark); font-weight: 600; }
    .dica-entrega { margin: 12px 0 0; font-size: 0.82rem; color: var(--text-muted); }
    .drawer-body label { display: block; font-weight: 600; margin: 16px 0 6px; font-size: 0.88rem; color: var(--text); }
    .drawer-body input {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid var(--border);
      border-radius: 12px;
      box-sizing: border-box;
      background: var(--card);
      color: var(--text);
      font-size: 0.95rem;
      outline: none;
      transition: border-color var(--transition), box-shadow var(--transition);
    }
    .drawer-body input:focus { border-color: var(--primary); box-shadow: 0 0 0 4px var(--primary-light); }
    .btn-checkout {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: #fff;
      border: none;
      border-radius: 12px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 10px;
      box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 30%, transparent);
      transition: filter var(--transition), transform var(--transition), box-shadow var(--transition);
    }
    .btn-checkout:hover:not(:disabled) { filter: brightness(1.05); box-shadow: 0 6px 16px color-mix(in srgb, var(--primary) 40%, transparent); }
    .btn-checkout:active:not(:disabled) { transform: scale(0.99); }
    .btn-checkout:disabled { background: var(--surface-hover); color: var(--text-muted); cursor: not-allowed; box-shadow: none; }
    .btn-cancel {
      width: 100%;
      padding: 13px;
      background: transparent;
      color: var(--text-muted);
      border: 1px solid var(--border);
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 8px;
      transition: background var(--transition), color var(--transition), border-color var(--transition), transform var(--transition);
    }
    .btn-cancel:hover { background: var(--surface-hover); color: var(--text); }
    .btn-cancel:active { transform: scale(0.99); }
    .btn-acompanhar {
      display: inline-block;
      margin-top: 14px;
      padding: 12px 18px;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: #fff;
      border-radius: 12px;
      font-weight: 700;
      text-decoration: none;
      font-size: 0.9rem;
    }
    .erro { background: var(--danger-light); color: var(--danger); padding: 12px; border-radius: 10px; font-size: 0.88rem; font-weight: 500; }
    .req { color: var(--danger); }
    .success { text-align: center; padding: 16px 0; }
    .success-icon { font-size: 3rem; margin: 24px 0 8px; }
    .drawer-footer h3 { margin: 8px 0 0; font-size: 1.1rem; }
  `]
})
export class CarrinhoDrawerComponent {
  cartService = inject(CartService);
  private readonly pedidoService = inject(PedidoService);
  readonly configuracoes = inject(ConfiguracoesService);

  isOpen = signal<boolean>(false);
  erro = signal<string | null>(null);
  etapa = signal<Etapa>('carrinho');
  cliente = signal<string>('');
  telefone = signal<string>('');
  endereco = signal<string>('');
  tipoEntrega = signal<TipoEntrega>('RETIRADA');
  enviando = signal(false);
  pedidoSucesso = signal<string>('');
  pedidoId = signal<string>('');

  // Taxa aplicada apenas quando a forma de receber escolhida é 'ENTREGA'
  taxa = computed(() =>
    this.tipoEntrega() === 'ENTREGA' ? this.configuracoes.taxaEntrega() : 0,
  );
  totalComTaxa = computed(() => this.cartService.totalPrice() + this.taxa());

  irParaEntrega(): void {
    this.erro.set(null);
    this.etapa.set('entrega');
  }

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

  voltarCheckout(): void {
    this.erro.set(null);
    this.etapa.set('entrega');
  }

  confirmarPedido(): void {
    if (!this.configuracoes.aceitandoPedidos()) {
      this.erro.set('A casa está offline e não está recebendo pedidos.');
      return;
    }

    if (!this.cliente().trim()) {
      this.erro.set('Informe seu nome para continuar.');
      return;
    }

    if (!this.telefone().trim()) {
      this.erro.set('Informe um telefone de contato.');
      return;
    }

    if (this.tipoEntrega() === 'ENTREGA' && !this.endereco().trim()) {
      this.erro.set('Informe o endereço de entrega.');
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
        tipoEntrega: this.tipoEntrega(),
        telefone: this.telefone().trim(),
        endereco:
          this.tipoEntrega() === 'ENTREGA' ? this.endereco().trim() : undefined,
        itens,
      })
      .subscribe({
        next: (pedido) => {
          this.pedidoId.set(pedido.id);
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
    this.telefone.set('');
    this.endereco.set('');
    this.tipoEntrega.set('RETIRADA');
    this.erro.set(null);
    this.pedidoSucesso.set('');
    this.pedidoId.set('');
  }
}