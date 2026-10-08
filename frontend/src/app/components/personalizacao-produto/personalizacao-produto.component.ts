import {
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Produto,
  ProdutoIngrediente,
  ProdutoGrupo,
  ehMontagem,
} from '../../services/produto.service';
import { CartItem, CartService } from '../../services/cart.service';

interface EstadoIngrediente {
  vinculo: ProdutoIngrediente;
  quantidade: number;
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
          <h3>
            @if (editando()) {
              Corrigir {{ produto()!.nome }}
            } @else {
              {{ produto()!.nome }}
            }
          </h3>
          <button (click)="fechar()">✕</button>
        </div>

        <div class="modal-body">
          @if (produto()!.descricao) {
            <p class="desc">{{ produto()!.descricao }}</p>
          }

          @if (ingredientes().length === 0) {
            <p class="sem-ingredientes">Este produto não possui ingredientes personalizáveis.</p>
          } @else if (montagem()) {
            <p class="desc montagem-ajuda">
              Monte do zero. Cada seção tem um limite de porções.
            </p>

            @for (grupo of gruposDoProduto(); track grupo.nome) {
              <section class="grupo">
                <header class="grupo-header">
                  <h4>{{ grupo.nome }}</h4>
                  <span class="grupo-contador" [class.cheio]="grupoCheio(grupo)">
                    {{ escolhidosNoGrupo(grupo) }} de {{ grupo.maximoEscolhas }}
                    {{ grupo.maximoEscolhas === 1 ? 'porção' : 'porções' }}
                  </span>
                </header>
                <ul class="ingredientes">
                  @for (ing of ingredientesDoGrupo(grupo); track ing.vinculo.ingredienteId) {
                    <ng-container *ngTemplateOutlet="linha; context: { $implicit: ing, semRotulo: true }" />
                  }
                </ul>
              </section>
            }

            @if (ingredientesSoltos().length > 0) {
              <section class="grupo">
                <header class="grupo-header">
                  <h4>Outros ingredientes</h4>
                  <span class="grupo-contador livre">sem limite</span>
                </header>
                <ul class="ingredientes">
                  @for (ing of ingredientesSoltos(); track ing.vinculo.ingredienteId) {
                    <ng-container *ngTemplateOutlet="linha; context: { $implicit: ing, semRotulo: true }" />
                  }
                </ul>
              </section>
            }
          } @else {
            <h4>Personalize seus ingredientes</h4>
            <ul class="ingredientes">
              @for (ing of ingredientes(); track ing.vinculo.ingredienteId) {
                <ng-container *ngTemplateOutlet="linha; context: { $implicit: ing, semRotulo: false }" />
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
            @if (editando()) {
              Salvar correções
            } @else {
              Adicionar {{ quantidade() > 1 ? quantidade() + 'x' : '' }} ao Carrinho
            }
          </button>
        </div>
      </div>
    }

    <ng-template #linha let-ing let-semRotulo="semRotulo">
      <li class="linha" [class.fora]="removido(ing)">
        <div class="info">
          <span class="nome">{{ ing.vinculo.ingrediente!.nome }}</span>
          @if (removido(ing)) {
            <span class="extra sem">Sem este ingrediente</span>
          } @else if (ing.vinculo.precoAdicional > 0) {
            <span class="extra">
              +{{ ing.vinculo.precoAdicional | currency:'BRL' }}
              @if (copias(ing) > 1) {
                <span class="extra-total">
                  × {{ copias(ing) }} = {{ ing.vinculo.precoAdicional * copias(ing) | currency:'BRL' }}
                </span>
              }
            </span>
          } @else if (semRotulo) {
            <span class="extra incluso">incluso no preço</span>
          } @else if (copias(ing) > 0) {
            <span class="extra incluso">gratuito</span>
          }
        </div>
        <div class="stepper">
          <button
            class="toggle"
            [disabled]="ing.quantidade === 0"
            (click)="diminuir(ing)"
            [attr.aria-label]="'Diminuir ' + ing.vinculo.ingrediente!.nome"
          >
            −
          </button>
          <span class="qtd-extra">{{ ing.quantidade }}</span>
          <button
            class="toggle"
            [disabled]="naoPodeSomar(ing)"
            (click)="aumentar(ing)"
            [attr.aria-label]="'Aumentar ' + ing.vinculo.ingrediente!.nome"
          >
            +
          </button>
        </div>
      </li>
    </ng-template>
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: var(--overlay); backdrop-filter: blur(3px); z-index: var(--z-modal); animation: fadeIn 0.2s ease; }
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
      z-index: var(--z-modal-panel);
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
    .montagem-ajuda { margin: 0 0 14px; }
    .grupo { margin-bottom: 18px; }
    .grupo:last-child { margin-bottom: 0; }
    .grupo-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 10px;
      padding-bottom: 7px;
      margin-bottom: 2px;
      border-bottom: 2px solid var(--primary-light);
    }
    .grupo-header h4 { margin: 0; }
    .grupo-contador {
      font-size: 0.76rem;
      font-weight: 700;
      color: var(--text-muted);
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    .grupo-contador.cheio { color: var(--primary); }
    .grupo-contador.livre { font-weight: 600; }
    .ingredientes { list-style: none; margin: 0; padding: 0; }
    .linha { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 13px 2px; border-bottom: 1px solid var(--border); }
    .linha:last-child { border-bottom: none; }
    .info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .nome { font-weight: 600; font-size: 0.92rem; }
    .extra { color: var(--accent-dark); font-size: 0.82rem; font-weight: 700; }
    .extra-total { color: var(--text-muted); font-weight: 600; }
    .extra.sem { color: var(--danger); font-size: 0.78rem; font-weight: 600; }
    .extra.incluso { color: var(--text-muted); font-size: 0.78rem; font-weight: 600; }
    .linha.fora { opacity: 0.55; }
    .linha.fora .nome { text-decoration: line-through; }
    .stepper {
      display: flex;
      align-items: center;
      gap: 2px;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 3px;
      flex-shrink: 0;
    }
    .stepper .toggle {
      border: none;
      background: transparent;
      width: 26px;
      height: 26px;
      border-radius: 8px;
      font-size: 1.1rem;
      font-weight: 700;
      line-height: 1;
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background var(--transition), color var(--transition), transform var(--transition);
    }
    .stepper .toggle:hover:not(:disabled) { background: var(--surface-hover); }
    .stepper .toggle:active:not(:disabled) { transform: scale(0.9); }
    .qtd-extra { min-width: 22px; text-align: center; font-weight: 800; font-size: 0.9rem; }
    .toggle:disabled { opacity: 0.4; cursor: not-allowed; }
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
      color: var(--on-accent);
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
  // Informado quando o modal é aberto para corrigir um item já no carrinho.
  itemEmEdicao = input<CartItem | null>(null);
  fecharEvento = output<void>();

  private readonly cartService = inject(CartService);

  ingredientes = signal<EstadoIngrediente[]>([]);
  quantidade = signal(1);

  constructor() {
    effect(() => {
      const vinculos = this.produto()?.ingredientes ?? [];
      const item = this.itemEmEdicao();
      const montagem = this.montagem();

      // Ao corrigir, o modal abre no estado que já está no carrinho: os
      // removidos voltam a 0 e cada adicional soma uma cópia à base.
      const removidos = new Set(
        item?.personalizacao.removidos.map((r) => r.ingredienteId) ?? [],
      );
      const extras = (item?.personalizacao.adicionados ?? []).reduce<
        Record<string, number>
      >((acc, a) => {
        acc[a.ingredienteId] = (acc[a.ingredienteId] ?? 0) + 1;
        return acc;
      }, {});

      this.ingredientes.set(
        vinculos.map((vinculo) => ({
          vinculo,
          // Em montagem nada vem incluso: a quantidade é só o que o cliente
          // escolheu. Em produto comum todo ingrediente começa em 1 e cópias
          // extras podem ser adicionadas quando houver valor agregado.
          quantidade: montagem
            ? (extras[vinculo.ingredienteId] ?? 0)
            : removidos.has(vinculo.ingredienteId)
              ? 0
              : 1 + (extras[vinculo.ingredienteId] ?? 0),
        })),
      );
      this.quantidade.set(item?.quantidade ?? 1);
    });
  }

  // Produto de montagem: o cliente escolhe do zero, respeitando o teto de cada
  // grupo. Produto comum mantém o comportamento de remover/acrescentar.
  montagem(): boolean {
    return ehMontagem(this.produto());
  }

  // Seções de escolha do produto, na ordem em que o cardápio apresenta.
  gruposDoProduto(): ProdutoGrupo[] {
    return [...(this.produto()?.grupos ?? [])].sort(
      (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0),
    );
  }

  // Ingredientes que pertencem a um grupo. O vínculo vem por id (grupoId); o
  // nome serve de reserva para quando a API não trouxer o id preenchido.
  private pertenceAoGrupo(ing: EstadoIngrediente, grupo: ProdutoGrupo): boolean {
    if (ing.vinculo.grupoId) return ing.vinculo.grupoId === grupo.id;
    return ing.vinculo.grupo?.nome === grupo.nome;
  }

  ingredientesDoGrupo(grupo: ProdutoGrupo): EstadoIngrediente[] {
    return this.ingredientes().filter((i) => this.pertenceAoGrupo(i, grupo));
  }

  // Ingredientes sem grupo: ficam soltos, sem teto de porções.
  ingredientesSoltos(): EstadoIngrediente[] {
    const grupos = this.gruposDoProduto();
    return this.ingredientes().filter(
      (i) => !grupos.some((g) => this.pertenceAoGrupo(i, g)),
    );
  }

  // Porções já escolhidas no grupo. A repetição conta: pedir duas vezes a mesma
  // proteína são duas porções, tal como a validação do servidor considera.
  escolhidosNoGrupo(grupo: ProdutoGrupo): number {
    return this.ingredientesDoGrupo(grupo).reduce(
      (acc, i) => acc + i.quantidade,
      0,
    );
  }

  grupoCheio(grupo: ProdutoGrupo): boolean {
    return this.escolhidosNoGrupo(grupo) >= grupo.maximoEscolhas;
  }

  // Teto do grupo, sem contar o próprio ingrediente que se quer somar: assim dá
  // para desmarcar a última porção já escolhida.
  estourouGrupo(ing: EstadoIngrediente): boolean {
    if (!this.montagem()) return false;
    const grupo = this.grupoDe(ing);
    if (!grupo) return false;
    const outras = this.escolhidosNoGrupo(grupo) - ing.quantidade;
    return outras >= grupo.maximoEscolhas;
  }

  private grupoDe(ing: EstadoIngrediente): ProdutoGrupo | undefined {
    return this.gruposDoProduto().find((g) => this.pertenceAoGrupo(ing, g));
  }

  // Distingue "adicionar ao carrinho" de "salvar a correção do item"
  editando(): boolean {
    return this.itemEmEdicao() !== null;
  }

  aumentarQuantidade(): void {
    this.quantidade.update((q) => q + 1);
  }

  diminuirQuantidade(): void {
    this.quantidade.update((q) => Math.max(1, q - 1));
  }

  // Ingrediente não incluso (removido pelo cliente: quantidade zerada)
  removido(ing: EstadoIngrediente): boolean {
    return !this.montagem() && ing.quantidade === 0;
  }

  // Há cópias extras além do padrão incluso (lembrando que todo ingrediente
  // começa em 1)
  adicional(ing: EstadoIngrediente): boolean {
    return ing.quantidade > 1;
  }

  // Quantas cópias deste ingrediente vão para a lista de "adicionados" enviada
  // ao servidor. Em montagem não há cópia base: cada escolha é uma adição.
  copias(ing: EstadoIngrediente): number {
    return this.montagem() ? ing.quantidade : Math.max(0, ing.quantidade - 1);
  }

  // O "+" só fica indisponível no teto de 99 ou quando somar estouraria o
  // teto do grupo. Ingrediente gratuito (`precoAdicional: 0`) soma livremente:
  // cada cópia a mais não muda o preço, então o cliente leva quantas quiser.
  naoPodeSomar(ing: EstadoIngrediente): boolean {
    if (ing.quantidade >= 99) return true;
    if (this.montagem()) return this.estourouGrupo(ing);
    return false;
  }

  precoTotal(): number {
    const base = this.produto()?.preco ?? 0;
    // Em montagem cada porção escolhida é cobrada; em produto comum só as
    // cópias extras além da 1ª já inclusa no produto.
    const extras = this.ingredientes().reduce(
      (acc, i) =>
        acc + this.copias(i) * (i.vinculo.precoAdicional ?? 0),
      0,
    );
    return base + extras;
  }

  aumentar(ing: EstadoIngrediente): void {
    if (this.naoPodeSomar(ing)) return;
    this.ingredientes.update((lista) =>
      lista.map((i) =>
        i.vinculo.ingredienteId === ing.vinculo.ingredienteId
          ? { ...i, quantidade: Math.min(i.quantidade + 1, 99) }
          : i,
      ),
    );
  }

// Em montagem não há "cópia base" a preservar: dar "−" sempre volta uma
  // porção escolhida, para o cliente poder refazer a monta.
  diminuir(ing: EstadoIngrediente): void {
    this.ingredientes.update((lista) =>
      lista.map((i) =>
        i.vinculo.ingredienteId === ing.vinculo.ingredienteId
          ? { ...i, quantidade: Math.max(0, i.quantidade - 1) }
          : i,
      ),
    );
  }

  adicionar(): void {
    const produto = this.produto();
    if (!produto) return;

    // "Sem": ingredientes base removidos (quantidade zerada). Não existe em
    // montagem — lá o cliente apenas escolhe o que quer, sem remover.
    const removidos = this.montagem()
      ? []
      : this.ingredientes()
          .filter((i) => this.removido(i))
          .map((i) => ({
            ingredienteId: i.vinculo.ingredienteId,
            nome: i.vinculo.ingrediente!.nome,
            preco: 0,
          }));

    // "Adicionados": uma entrada por porção escolhida, repetição incluída. O
    // servidor usa esta lista para conferir o teto de cada grupo.
    const adicionados = this.ingredientes()
      .filter((i) => this.copias(i) > 0)
      .flatMap((i) =>
        Array.from(
          { length: this.copias(i) },
          () => ({
            ingredienteId: i.vinculo.ingredienteId,
            nome: i.vinculo.ingrediente!.nome,
            preco: i.vinculo.precoAdicional ?? 0,
          }),
        ),
      );

    const item = this.itemEmEdicao();
    if (item) {
      // Correção vinda do carrinho: substitui o item, não cria outro.
      this.cartService.atualizarItem(
        item.uid,
        this.quantidade(),
        removidos,
        adicionados,
      );
    } else {
      this.cartService.addPersonalizado(
        produto,
        this.quantidade(),
        removidos,
        adicionados,
      );
    }
    this.fechar();
  }

  fechar(): void {
    this.ingredientes.set([]);
    this.quantidade.set(1);
    this.fecharEvento.emit();
  }
}
