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
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 200; }
    .modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 360px; max-width: 92vw; max-height: 85vh; background: white; border-radius: 12px; z-index: 201; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.25); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid #eee; }
    .modal-header h3 { margin: 0; }
    .modal-header button { border: none; background: transparent; font-size: 1.2rem; cursor: pointer; }
    .modal-body { flex: 1; overflow-y: auto; padding: 16px; }
    .desc { color: #666; font-size: 0.9rem; margin: 0 0 12px; }
    .sem-ingredientes { color: #888; }
    .modal-body h4 { margin: 0 0 8px; }
    .ingredientes { list-style: none; margin: 0; padding: 0; }
    .linha { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0; gap: 8px; }
    .info { display: flex; flex-direction: column; }
    .nome { font-weight: 500; }
    .extra { color: #28a745; font-size: 0.85rem; font-weight: bold; }
    .acoes { display: flex; gap: 6px; }
    .toggle { border: 1px solid #ccc; background: white; border-radius: 6px; padding: 6px 10px; font-size: 0.8rem; cursor: pointer; }
    .toggle.adicionar.ativo { background: #28a745; color: white; border-color: #28a745; }
    .toggle.remover.ativo { background: #e74c3c; color: white; border-color: #e74c3c; }
    .toggle:disabled { opacity: 0.5; cursor: not-allowed; }
    .modal-footer { padding: 16px; border-top: 1px solid #eee; }
    .preco { margin: 0 0 10px; }
    .btn-adicionar { width: 100%; padding: 12px; background: #ff4757; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
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
