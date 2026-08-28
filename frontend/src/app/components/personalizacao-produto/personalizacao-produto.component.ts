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
          <p class="preco">
            Total:
            <strong>{{ precoTotal() | currency:'BRL' }}</strong>
          </p>
          <button class="btn-adicionar" (click)="adicionar()">Adicionar ao Carrinho</button>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(17,24,39,0.5); backdrop-filter: blur(2px); z-index: 200; }
    .modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 380px; max-width: 94vw; max-height: 85vh; background: var(--card, #fff); border-radius: 16px; z-index: 201; display: flex; flex-direction: column; overflow: hidden; box-shadow: var(--shadow-lg); animation: pop 0.18s ease; }
    @keyframes pop { from { transform: translate(-50%, -48%) scale(0.96); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; border-bottom: 1px solid var(--border, #eee); }
    .modal-header h3 { margin: 0; font-size: 1.1rem; }
    .modal-header button { border: none; background: #f1f2f4; width: 30px; height: 30px; border-radius: 999px; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-muted, #6b7280); transition: background 0.15s; }
    .modal-header button:hover { background: #e4e5e8; }
    .modal-body { flex: 1; overflow-y: auto; padding: 16px 18px; }
    .desc { color: var(--text-muted, #6b7280); font-size: 0.9rem; margin: 0 0 12px; line-height: 1.4; }
    .sem-ingredientes { color: var(--text-muted, #6b7280); }
    .modal-body h4 { margin: 0 0 10px; font-size: 0.95rem; color: var(--text, #1f2937); }
    .ingredientes { list-style: none; margin: 0; padding: 0; }
    .linha { display: flex; justify-content: space-between; align-items: center; padding: 12px 2px; border-bottom: 1px solid var(--border, #f0f0f0); gap: 8px; }
    .info { display: flex; flex-direction: column; }
    .nome { font-weight: 500; }
    .extra { color: var(--accent-dark, #16a34a); font-size: 0.85rem; font-weight: 600; }
    .acoes { display: flex; gap: 6px; }
    .toggle { border: 1px solid var(--border, #e5e7eb); background: var(--card, #fff); border-radius: 9px; padding: 6px 10px; font-size: 0.8rem; cursor: pointer; font-weight: 500; transition: background 0.15s, color 0.15s; }
    .toggle.adicionar.ativo { background: var(--accent-dark, #16a34a); color: white; border-color: var(--accent-dark, #16a34a); }
    .toggle.remover.ativo { background: #ef4444; color: white; border-color: #ef4444; }
    .toggle:disabled { opacity: 0.45; cursor: not-allowed; }
    .modal-footer { padding: 16px 18px; border-top: 1px solid var(--border, #eee); background: #fafbfc; }
    .preco { margin: 0 0 10px; }
    .preco strong { color: var(--accent-dark, #16a34a); }
    .btn-adicionar { width: 100%; padding: 13px; background: var(--primary, #ff4757); color: white; border: none; border-radius: 11px; font-weight: 600; cursor: pointer; transition: filter 0.15s, transform 0.1s; }
    .btn-adicionar:hover { filter: brightness(1.06); }
    .btn-adicionar:active { transform: scale(0.98); }
  `],
})
export class PersonalizacaoProdutoComponent {
  produto = input.required<Produto>();
  fecharEvento = output<void>();

  private readonly cartService = inject(CartService);

  ingredientes = signal<EstadoIngrediente[]>([]);

  constructor() {
    effect(() => {
      const vinculos = this.produto()?.ingredientes ?? [];
      this.ingredientes.set(
        vinculos.map((vinculo) => ({ vinculo, removido: false, adicionado: false })),
      );
    });
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

    this.cartService.addPersonalizado(produto, 1, removidos, adicionados);
    this.fechar();
  }

  fechar(): void {
    this.ingredientes.set([]);
    this.fecharEvento.emit();
  }
}
