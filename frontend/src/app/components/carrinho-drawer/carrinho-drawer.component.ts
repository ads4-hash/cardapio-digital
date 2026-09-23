import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartService, ItemIngrediente } from '../../services/cart.service';
import {
  PedidoService,
  TipoEntrega,
  FormaPagamento,
} from '../../services/pedidos.service';
import { ConfiguracoesService } from '../../services/configuracoes.service';
import { ProdutoService, Produto } from '../../services/produto.service';

type Etapa = 'carrinho' | 'checkout' | 'sucesso';

@Component({
  selector: 'app-carrinho-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <!-- Botão Flutuante -->
    <button class="cart-float-btn" (click)="abrirCarrinho()">
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

            <p class="pag-titulo">Forma de pagamento <span class="req">*</span></p>
            <div class="opcoes-pag">
              @for (opcao of formasPagamento; track opcao.valor) {
                <label class="opcao" [class.selecionada]="formaPagamento() === opcao.valor">
                  <input
                    type="radio"
                    name="formaPagamento"
                    [checked]="formaPagamento() === opcao.valor"
                    (change)="selecionarPagamento(opcao.valor)"
                  />
                  <span class="opcao-info">
                    <strong>{{ opcao.rotulo }}</strong>
                  </span>
                </label>
              }
            </div>

            @if (formaPagamento() === 'DINHEIRO') {
              <p class="troco-titulo">Precisa de troco?</p>
              <div class="troco-opcoes">
                <button
                  type="button"
                  class="troco-btn"
                  [class.ativo]="!desejaTroco()"
                  (click)="desejaTroco.set(false)"
                >
                  Não
                </button>
                <button
                  type="button"
                  class="troco-btn"
                  [class.ativo]="desejaTroco()"
                  (click)="desejaTroco.set(true)"
                >
                  Sim
                </button>
              </div>
              @if (desejaTroco()) {
                <label for="trocoPara">Troco para quanto? <span class="opcional">(valor entregue)</span></label>
                <input
                  id="trocoPara"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="0.01"
                  [ngModel]="trocoPara()"
                  (ngModelChange)="trocoPara.set($event)"
                  placeholder="Ex: 50"
                />
              }
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
            @if (erro()) {
              <p class="erro">{{ erro() }}</p>
            }
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
                        + {{ agruparAdicionados(item.personalizacao.adicionados) }}
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
              <div class="entrega">
                <p class="entrega-titulo">Como deseja receber? <span class="req">*</span></p>
                <div class="opcoes-entrega">
                  <label class="opcao" [class.selecionada]="tipoEntrega() === 'RETIRADA'">
                    <input
                      type="radio"
                      name="tipoEntrega"
                      [checked]="tipoEntrega() === 'RETIRADA'"
                      (change)="tipoEntrega.set('RETIRADA')"
                    />
                    <span class="opcao-info">
                      <strong>🏪 Retirada</strong>
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
                    </span>
                  </label>
                </div>
              </div>
            }
          </div>

          <div class="drawer-footer">
            <p class="linha-total">Subtotal: {{ cartService.totalPrice() | currency:'BRL' }}</p>
            @if (taxa() > 0) {
              <p class="linha-total taxa">Taxa de entrega: {{ taxa() | currency:'BRL' }}</p>
            }
            <h3>Total: {{ totalComTaxa() | currency:'BRL' }}</h3>
            <button [disabled]="cartService.items().length === 0" class="btn-checkout" (click)="irParaCheckout()">
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
    .pag-titulo, .troco-titulo { font-weight: 700; margin: 16px 0 6px; font-size: 0.82rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; }
    .opcoes-entrega { display: flex; gap: 8px; margin-top: 4px; }
    .opcoes-entrega .opcao {
      flex: 1;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      gap: 4px;
      padding: 10px 6px;
      margin-bottom: 0;
      white-space: nowrap;
    }
    .opcoes-entrega .opcao input { margin: 0; }
    .opcoes-entrega .opcao-info { align-items: center; }
    .opcoes-pag { display: flex; gap: 8px; margin-top: 4px; }
    .opcoes-pag .opcao {
      flex: 1;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      gap: 4px;
      padding: 10px 6px;
      margin-bottom: 0;
      white-space: nowrap;
    }
    .opcoes-pag .opcao input { margin: 0; }
    .opcoes-pag .opcao-info { align-items: center; }
    .troco-titulo { margin-top: 18px; }
    .troco-opcoes { display: flex; gap: 8px; }
    .troco-btn {
      flex: 1;
      padding: 10px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--card);
      color: var(--text);
      font-weight: 600;
      cursor: pointer;
      transition: background var(--transition), border-color var(--transition), color var(--transition);
    }
    .troco-btn.ativo { border-color: var(--primary); background: var(--primary-light); color: var(--primary-dark); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent); }
    .opcional { color: var(--text-muted); font-weight: 500; text-transform: none; letter-spacing: 0; font-size: 0.8rem; }
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
  private readonly produtoService = inject(ProdutoService);
  readonly configuracoes = inject(ConfiguracoesService);

  isOpen = signal<boolean>(false);
  erro = signal<string | null>(null);
  etapa = signal<Etapa>('carrinho');
  cliente = signal<string>('');
  telefone = signal<string>('');
  endereco = signal<string>('');
  tipoEntrega = signal<TipoEntrega | null>(null);
  formaPagamento = signal<FormaPagamento>('DINHEIRO');
  desejaTroco = signal(false);
  trocoPara = signal<number | null>(null);
  enviando = signal(false);
  pedidoSucesso = signal<string>('');
  pedidoId = signal<string>('');

  readonly formasPagamento: {
    valor: FormaPagamento;
    rotulo: string;
  }[] = [
    { valor: 'DINHEIRO', rotulo: '💵 Dinheiro' },
    { valor: 'PIX', rotulo: '🟢 Pix' },
    { valor: 'CARTAO', rotulo: '💳 Cartão' },
  ];

  selecionarPagamento(f: FormaPagamento): void {
    this.formaPagamento.set(f);
    if (f !== 'DINHEIRO') {
      this.desejaTroco.set(false);
      this.trocoPara.set(null);
    }
  }

  // Taxa aplicada apenas quando a forma de receber escolhida é 'ENTREGA'
  taxa = computed(() =>
    this.tipoEntrega() === 'ENTREGA' ? this.configuracoes.taxaEntrega() : 0,
  );
  totalComTaxa = computed(() => this.cartService.totalPrice() + this.taxa());

  async irParaCheckout(): Promise<void> {
    if (!this.tipoEntrega()) {
      this.erro.set('Escolha como deseja receber o pedido.');
      return;
    }
    const removidos = await this.limparItensIndisponiveis();
    if (removidos.length > 0) {
      this.erro.set(
        `Alguns itens saíram do cardápio e foram removidos do carrinho: ${removidos.join(', ')}`,
      );
      return;
    }
    this.erro.set(null);
    this.etapa.set('checkout');
  }

  // Remove do carrinho itens cujo produto não existe mais no catálogo atual
  // (busca a lista fresca da API, de forma que exclusões feitas no painel
  // sejam consideradas mesmo com a tela usando cache). Retorna os nomes dos
  // itens removidos.
  private async limparItensIndisponiveis(): Promise<string[]> {
    const catalogo = await this.produtoService.carregarProdutosAtualizados();
    if (catalogo.length === 0) return [];
    const disponiveis = new Set(catalogo.map((p) => p.id));
    const removidos: string[] = [];
    const restantes: {
      uid: string;
      produto: Produto;
      quantidade: number;
      precoUnitario: number;
      personalizacao: { removidos: ItemIngrediente[]; adicionados: ItemIngrediente[] };
    }[] = [];
    for (const item of this.cartService.items()) {
      if (item.produto.id && disponiveis.has(item.produto.id)) {
        restantes.push(item);
      } else {
        removidos.push(item.produto.nome);
      }
    }
    if (removidos.length > 0) {
      this.cartService.atualizarItens(restantes);
    }
    return removidos;
  }

  async abrirCarrinho(): Promise<void> {
    const removidos = await this.limparItensIndisponiveis();
    if (removidos.length > 0) {
      this.erro.set(
        `${removidos.join(', ')} saiu do cardápio e foi removido do carrinho.`,
      );
    }
    this.isOpen.set(true);
  }

  nomesIngredientes(lista: ItemIngrediente[]): string {
    return lista.map((i) => i.nome).join(', ');
  }

  agruparAdicionados(lista: ItemIngrediente[]): string {
    const contagem = new Map<string, number>();
    for (const item of lista) {
      contagem.set(item.nome, (contagem.get(item.nome) ?? 0) + 1);
    }
    return [...contagem.entries()]
      .map(([nome, qtd]) => (qtd > 1 ? `${qtd}x ${nome}` : nome))
      .join(', ');
  }

  voltarCheckout(): void {
    this.erro.set(null);
    this.etapa.set('carrinho');
  }

  async confirmarPedido(): Promise<void> {
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

    if (!this.tipoEntrega()) {
      this.erro.set('Escolha como deseja receber o pedido.');
      return;
    }

    if (this.tipoEntrega() === 'ENTREGA' && !this.endereco().trim()) {
      this.erro.set('Informe o endereço de entrega.');
      return;
    }

    if (this.cartService.items().length === 0) return;

    const indisponiveis = await this.limparItensIndisponiveis();
    if (indisponiveis.length > 0) {
      this.erro.set(
        `${indisponiveis.join(', ')} saiu do cardápio e foi removido do carrinho. Revise antes de enviar.`,
      );
      return;
    }

    // Troco: só faz sentido em dinheiro e exige o valor a ser pago. O total é
    // validado aqui e reforçado no servidor (trocoPara >= total).
    let trocoPara: number | undefined;
    if (this.formaPagamento() === 'DINHEIRO' && this.desejaTroco()) {
      const numero = this.trocoPara();
      if (numero == null || !Number.isFinite(numero) || numero <= 0) {
        this.erro.set('Informe o valor para calcular o troco.');
        return;
      }
      if (numero < this.totalComTaxa()) {
        this.erro.set('O valor informado é menor que o total do pedido.');
        return;
      }
      trocoPara = numero;
    }

    this.enviando.set(true);
    this.erro.set(null);

    const itens = this.cartService.items().map((item) => ({
      produtoId: item.produto.id!,
      quantidade: item.quantidade,
      removidos: item.personalizacao.removidos.map((r) => r.ingredienteId),
      adicionados: item.personalizacao.adicionados.map((a) => a.ingredienteId),
    }));

    const tipoEntrega = this.tipoEntrega() as TipoEntrega;

    this.pedidoService
      .criar({
        cliente: this.cliente().trim(),
        tipoEntrega,
        telefone: this.telefone().trim(),
        endereco: tipoEntrega === 'ENTREGA' ? this.endereco().trim() : undefined,
        formaPagamento: this.formaPagamento(),
        trocoPara,
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
    this.tipoEntrega.set(null);
    this.formaPagamento.set('DINHEIRO');
    this.desejaTroco.set(false);
    this.trocoPara.set(null);
    this.erro.set(null);
    this.pedidoSucesso.set('');
    this.pedidoId.set('');
  }
}