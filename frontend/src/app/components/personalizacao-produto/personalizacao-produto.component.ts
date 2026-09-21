import {
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Produto, ProdutoIngrediente } from '../../services/produto.service';
import { CartService } from '../../services/cart.service';

interface EstadoIngrediente {
  vinculo: ProdutoIngrediente;
  removido: boolean;
  adicionado: boolean;
}

@Component({
  selector: 'app-personalizacao-produto',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (produto()) {
      <div class="overlay" (click)="fechar()"></div>
      <div class="modal">
        <div class="modal-header">
          <h3>{{ produto()!.nome }}</h3>
          <button (click)="fechar()">✕</button>
        </div>

        <div class="modal-body">
          @if (produto()!.descricao) {
            <p class="desc">{{ produto()!.descricao }}</p>
          }

          @if (ingredientes().length === 0) {
            <p class="sem-ingredientes">Este produto não possui ingredientes personalizáveis.</p>
          } @else {
            <h4>Personalize seus ingredientes</h4>
            <ul class="ingredientes">
              @for (ing of ingredientes(); track ing.vinculo.ingredienteId) {
                <li class="linha">
                  <div class="info">
                    <span class="nome">{{ ing.vinculo.ingrediente!.nome }}</span>
                    @if (ing.vinculo.precoAdicional > 0) {
                      <span class="extra">+{{ ing.vinculo.precoAdicional | currency:'BRL' }}</span>
                    }
                  </div>
                  <div class="acoes">
                    @if (ing.vinculo.precoAdicional > 0) {
                      <button
                        class="toggle adicionar"
                        [class.ativo]="ing.adicionado"
                        [disabled]="ing.removido"
                        (click)="alternarAdicionado(ing)"
                      >
                        {{ ing.adicionado ? '✔ Adicionado' : '+ Adicionar' }}
                      </button>
                    }
                    <button
                      class="toggle remover"
                      [class.ativo]="ing.removido"
                      [disabled]="ing.adicionado"
                      (click)="alternarRemovido(ing)"
                    >
                      {{ ing.removido ? '✔ Remover' : '– Remover' }}
                    </button>
                  </div>
                </li>
              }
            </ul>
          }
        </div>

        <div class="modal-footer">
          <div class="rodape-linha">
            <div class="quantidade">
              <span class="qtd-label">Quantidade</span>
              <div class="qtd-controles">
                <button class="qtd-btn" (click)="diminuirQuantidade()" [disabled]="quantidade() <= 1">−</button>
                <span class="qtd-valor">{{ quantidade() }}</span>
                <button class="qtd-btn" (click)="aumentarQuantidade()">+</button>
              </div>
            </div>
            <p class="preco">
              Total:
              <strong>{{ precoTotal() * quantidade() | currency:'BRL' }}</strong>
            </p>
          </div>
          <button class="btn-adicionar" (click)="adicionar()">
            Adicionar {{ quantidade() > 1 ? quantidade() + 'x' : '' }} ao Carrinho
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: var(--overlay); backdrop-filter: blur(3px); z-index: 200; animation: fadeIn 0.2s ease; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 420px;
      max-width: calc(100vw - 24px);
      max-height: 86vh;
      background: var(--card);
      border-radius: 18px;
      z-index: 201;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: var(--shadow-lg);
      animation: pop 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    @keyframes pop { from { transform: translate(-50%, -48%) scale(0.96); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
    .modal-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 18px 20px; border-bottom: 1px solid var(--border); }
    .modal-header h3 { margin: 0; font-size: 1.15rem; font-weight: 800; letter-spacing: -0.01em; }
    .modal-header button {
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
    .modal-header button:hover { color: var(--danger); transform: rotate(90deg); }
    .modal-body { flex: 1; overflow-y: auto; padding: 18px 20px; }
    .desc { color: var(--text-muted); font-size: 0.9rem; margin: 0 0 14px; line-height: 1.5; }
    .sem-ingredientes { color: var(--text-muted); margin: 0; }
    .modal-body h4 { margin: 0 0 12px; font-size: 0.95rem; font-weight: 700; color: var(--text); }
    .ingredientes { list-style: none; margin: 0; padding: 0; }
    .linha { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 13px 2px; border-bottom: 1px solid var(--border); }
    .linha:last-child { border-bottom: none; }
    .info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .nome { font-weight: 600; font-size: 0.92rem; }
    .extra { color: var(--accent-dark); font-size: 0.82rem; font-weight: 700; }
    .acoes { display: flex; gap: 6px; flex-shrink: 0; }
    .toggle {
      border: 1px solid var(--border);
      background: var(--card);
      border-radius: 9px;
      padding: 7px 11px;
      font-size: 0.78rem;
      cursor: pointer;
      font-weight: 600;
      transition: background var(--transition), color var(--transition), border-color var(--transition), transform var(--transition);
    }
    .toggle:hover:not(:disabled) { transform: translateY(-1px); }
    .toggle:active:not(:disabled) { transform: scale(0.96); }
    .toggle.adicionar.ativo { background: var(--accent); color: #fff; border-color: var(--accent); }
    .toggle.remover.ativo { background: var(--danger); color: #fff; border-color: var(--danger); }
    .toggle:disabled { opacity: 0.45; cursor: not-allowed; }
    .modal-footer {
      padding: 16px 20px 18px;
      border-top: 1px solid var(--border);
      background: var(--surface-hover);
    }
    .rodape-linha { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
    .quantidade { display: flex; flex-direction: column; gap: 5px; }
    .qtd-label { font-size: 0.78rem; font-weight: 700; color: var(--text-muted); }
    .qtd-controles { display: flex; align-items: center; gap: 10px; }
    .qtd-btn {
      width: 32px;
      height: 32px;
      border: 1px solid var(--border);
      background: var(--card);
      color: var(--text);
      border-radius: 9px;
      font-size: 1.05rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color var(--transition), border-color var(--transition), transform var(--transition), opacity var(--transition);
    }
    .qtd-btn:hover:not(:disabled) { color: var(--primary); border-color: var(--primary); transform: translateY(-1px); }
    .qtd-btn:active:not(:disabled) { transform: scale(0.92); }
    .qtd-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .qtd-valor { min-width: 22px; text-align: center; font-weight: 800; font-size: 1.05rem; }
    .preco { margin: 0; font-weight: 500; }
    .preco strong { color: var(--accent-dark); font-size: 1.05rem; }
    .btn-adicionar {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: #fff;
      border: none;
      border-radius: 12px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 30%, transparent);
      transition: filter var(--transition), transform var(--transition), box-shadow var(--transition);
    }
    .btn-adicionar:hover { filter: brightness(1.05); box-shadow: 0 6px 16px color-mix(in srgb, var(--primary) 40%, transparent); }
    .btn-adicionar:active { transform: scale(0.98); }
  `],
})
export class PersonalizacaoProdutoComponent {
  produto = input.required<Produto>();
  fecharEvento = output<void>();

  private readonly cartService = inject(CartService);

  ingredientes = signal<EstadoIngrediente[]>([]);
  quantidade = signal(1);

  constructor() {
    effect(() => {
      const vinculos = this.produto()?.ingredientes ?? [];
      this.ingredientes.set(
        vinculos.map((vinculo) => ({ vinculo, removido: false, adicionado: false })),
      );
      this.quantidade.set(1);
    });
  }

  aumentarQuantidade(): void {
    this.quantidade.update((q) => q + 1);
  }

  diminuirQuantidade(): void {
    this.quantidade.update((q) => Math.max(1, q - 1));
  }

  precoTotal(): number {
    const base = this.produto()?.preco ?? 0;
    const extras = this.ingredientes()
      .filter((i) => i.adicionado)
      .reduce((acc, i) => acc + (i.vinculo.precoAdicional ?? 0), 0);
    return base + extras;
  }

  alternarRemovido(ing: EstadoIngrediente): void {
    if (ing.adicionado) return;
    this.ingredientes.update((lista) =>
      lista.map((i) =>
        i.vinculo.ingredienteId === ing.vinculo.ingredienteId
          ? { ...i, removido: !i.removido }
          : i,
      ),
    );
  }

  alternarAdicionado(ing: EstadoIngrediente): void {
    if (ing.removido) return;
    this.ingredientes.update((lista) =>
      lista.map((i) =>
        i.vinculo.ingredienteId === ing.vinculo.ingredienteId
          ? { ...i, adicionado: !i.adicionado }
          : i,
      ),
    );
  }

  adicionar(): void {
    const produto = this.produto();
    if (!produto) return;

    const removidos = this.ingredientes()
      .filter((i) => i.removido)
      .map((i) => ({
        ingredienteId: i.vinculo.ingredienteId,
        nome: i.vinculo.ingrediente!.nome,
        preco: 0,
      }));

    const adicionados = this.ingredientes()
      .filter((i) => i.adicionado)
      .map((i) => ({
        ingredienteId: i.vinculo.ingredienteId,
        nome: i.vinculo.ingrediente!.nome,
        preco: i.vinculo.precoAdicional ?? 0,
      }));

    this.cartService.addPersonalizado(
      produto,
      this.quantidade(),
      removidos,
      adicionados,
    );
    this.fechar();
  }

  fechar(): void {
    this.ingredientes.set([]);
    this.quantidade.set(1);
    this.fecharEvento.emit();
  }
}
