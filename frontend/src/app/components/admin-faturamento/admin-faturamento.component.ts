import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  PedidoService,
  Pedido,
  FormaPagamento,
  FORMA_PAGAMENTO_LABEL,
} from '../../services/pedidos.service';
import { ConfiguracoesService } from '../../services/configuracoes.service';

type Periodo = 'hoje' | 'semana' | 'mes' | 'todos';

const FORMA_PAGAMENTO_ICONE: Record<FormaPagamento, string> = {
  DINHEIRO: '💵',
  PIX: '🟢',
  CARTAO: '💳',
};

function paraDataIso(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// Resumo de faturamento: lista de pedidos concluídos + soma dos valores.
// Filtro por data/período aplicado no cliente (a lista completa já é carregada).
@Component({
  selector: 'app-admin-faturamento',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['../../ui/buttons.css', '../../ui/chips.css', '../../ui/cards.css', '../../ui/forms.css'],
  template: `
    <section class="faturamento">
      <div class="faturamento-top">
        <h2 class="section-title section-title--mb">Faturamento</h2>
        <button class="btn-refresh" (click)="carregar()">Atualizar</button>
      </div>

      <div class="card-taxa card card--padded">
        <div class="card-taxa-info">
          <strong>Taxa de entrega</strong>
          <small>
            Valor cobrado quando o cliente escolhe "Entrega" no carrinho.
            Atual: {{ configuracoes.taxaEntrega() > 0 ? (configuracoes.taxaEntrega() | currency:'BRL') : 'Grátis' }}
          </small>
        </div>
        <div class="card-taxa-controles">
          <input
            class="input input--md input--focus-accent"
            type="number"
            min="0"
            step="0.50"
            [value]="taxaInput()"
            (change)="setTaxaInput($any($event.target).value)"
            placeholder="0,00"
          />
          <button class="btn-salvar-taxa" (click)="salvarTaxa()">Salvar taxa</button>
        </div>
        @if (taxaSalva()) {
          <small class="taxa-ok">Taxa atualizada com sucesso!</small>
        }
      </div>

      <div class="filtros">
        <button
          class="filtro-chip"
          [class.ativo]="periodoAtivo('hoje')"
          (click)="aplicarPeriodo('hoje')"
        >
          Hoje
        </button>
        <button
          class="filtro-chip"
          [class.ativo]="periodoAtivo('semana')"
          (click)="aplicarPeriodo('semana')"
        >
          Últimos 7 dias
        </button>
        <button
          class="filtro-chip"
          [class.ativo]="periodoAtivo('mes')"
          (click)="aplicarPeriodo('mes')"
        >
          Este mês
        </button>
        <button
          class="filtro-chip"
          [class.ativo]="periodoAtivo('todos')"
          (click)="aplicarPeriodo('todos')"
        >
          Todo o período
        </button>
      </div>

      <div class="filtro-datas">
        <label>
          De
          <input class="input input--sm" type="date" [value]="de()" (change)="de.set($any($event.target).value)" />
        </label>
        <label>
          Até
          <input class="input input--sm" type="date" [value]="ate()" (change)="ate.set($any($event.target).value)" />
        </label>
      </div>

      @if (carregando()) {
        <p class="vazio">Carregando pedidos...</p>
      } @else if (filtrados().length === 0) {
        <p class="vazio">Nenhum pedido concluído neste período.</p>
      } @else {
        <div class="resumo">
          <div class="resumo-item card card--padded">
            <span>Pedidos concluídos</span>
            <strong>{{ filtrados().length }}</strong>
          </div>
          <div class="resumo-item card card--padded">
            <span>Fretes (taxa de entrega)</span>
            <strong>{{ totalFretes() | currency:'BRL' }}</strong>
          </div>
          <div class="resumo-item card card--padded">
            <span>Faturamento (só itens)</span>
            <strong>{{ totalItens() | currency:'BRL' }}</strong>
          </div>
          <div class="resumo-item destaque card card--padded">
            <span>Faturamento total</span>
            <strong>{{ totalFaturamento() | currency:'BRL' }}</strong>
          </div>
        </div>

        <div class="pagamento-resumo">
          @for (item of porFormaPagamento(); track item.forma) {
            <div class="pagamento-item card card--slim">
              <span class="pagamento-icone">{{ item.icone }}</span>
              <span class="pagamento-info">
                <strong>{{ item.rotulo }}</strong>
                <small>{{ item.quantidade }} pedido{{ item.quantidade > 1 ? 's' : '' }}</small>
              </span>
              <strong class="pagamento-total">{{ item.total | currency:'BRL' }}</strong>
            </div>
          }
        </div>

        <table class="tabela">
          <thead>
            <tr>
              <th>Pedido</th>
              <th class="alinha-direita">Valor</th>
            </tr>
          </thead>
          <tbody>
            @for (pedido of filtrados(); track pedido.id) {
              <tr>
                <td>#{{ pedido.id.slice(0, 8).toUpperCase() }}</td>
                <td class="alinha-direita">{{ pedido.total | currency:'BRL' }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: [
    `
    .faturamento { display: flex; flex-direction: column; gap: 14px; }
    .faturamento-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .filtros { display: flex; flex-wrap: wrap; gap: 8px; }
    .filtro-datas { display: flex; gap: 12px; flex-wrap: wrap; }
    .filtro-datas label { display: flex; flex-direction: column; gap: 5px; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); }
    .resumo { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    .resumo-item { display: flex; flex-direction: column; gap: 4px; }
    .resumo-item span { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; }
    .resumo-item strong { font-size: 1.3rem; }
    .resumo-item.destaque { background: linear-gradient(135deg, var(--accent), var(--accent-dark)); border: none; color: var(--on-accent); box-shadow: 0 8px 20px color-mix(in srgb, var(--accent) 35%, transparent); }
    .resumo-item.destaque span { color: rgba(255, 255, 255, 0.85); }
    .pagamento-resumo { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
    .pagamento-item { display: flex; align-items: center; gap: 12px; }
    .pagamento-icone { font-size: 1.3rem; }
    .pagamento-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
    .pagamento-info strong { font-size: 0.95rem; font-weight: 800; }
    .pagamento-info small { font-size: 0.75rem; color: var(--text-muted); font-weight: 600; }
    .pagamento-total { font-size: 1rem; font-weight: 800; white-space: nowrap; }
    .alinha-direita { text-align: right; }
    .card-taxa { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .card-taxa-info { display: flex; flex-direction: column; gap: 3px; }
    .card-taxa-info small { color: var(--text-muted); font-size: 0.82rem; }
    .card-taxa-controles { display: flex; align-items: center; gap: 8px; }
    .card-taxa-controles input { width: 130px; }
    .btn-salvar-taxa {
      padding: 10px 18px;
      background: linear-gradient(135deg, var(--accent), var(--accent-dark));
      color: var(--on-accent);
      border: none;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.88rem;
      cursor: pointer;
      transition: filter var(--transition), transform var(--transition), box-shadow var(--transition);
    }
    .btn-salvar-taxa:hover { filter: brightness(1.05); box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 35%, transparent); }
    .btn-salvar-taxa:active { transform: scale(0.98); }
    .taxa-ok { color: var(--success); font-size: 0.82rem; font-weight: 600; }
    `,
  ],
})
export class AdminFaturamentoComponent implements OnInit {
  private readonly pedidoService = inject(PedidoService);
  readonly configuracoes = inject(ConfiguracoesService);

  pedidos = signal<Pedido[]>([]);
  carregando = signal(false);
  de = signal('');
  ate = signal('');
  taxaInput = signal(0);
  taxaSalva = signal(false);

  // Apenas pedidos concluídos dentro do período selecionado
  filtrados = computed(() => {
    const inicio = this.de() ? new Date(`${this.de()}T00:00:00`) : null;
    const fim = this.ate() ? new Date(`${this.ate()}T23:59:59.999`) : null;
    return this.pedidos()
      .filter((pedido) => pedido.status === 'CONCLUIDO')
      .filter((pedido) => {
        const data = new Date(pedido.createdAt);
        return (!inicio || data >= inicio) && (!fim || data <= fim);
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  });

  // Soma dos valores dos pedidos filtrados
  totalFaturamento = computed(() =>
    this.filtrados().reduce((soma, pedido) => soma + pedido.total, 0),
  );

  // Soma das taxas de entrega (fretes) dos pedidos filtrados
  totalFretes = computed(() =>
    this.filtrados().reduce(
      (soma, pedido) => soma + (pedido.taxaEntrega ?? 0),
      0,
    ),
  );

  // Faturamento descontando os fretes
  totalItens = computed(() => this.totalFaturamento() - this.totalFretes());

  // Resumo por forma de pagamento (Dinheiro, Pix, Cartão)
  porFormaPagamento = computed(() => {
    const formas: FormaPagamento[] = ['DINHEIRO', 'PIX', 'CARTAO'];
    return formas
      .map((forma) => {
        const pedidosForma = this.filtrados().filter(
          (pedido) => pedido.formaPagamento === forma,
        );
        return {
          forma,
          rotulo: FORMA_PAGAMENTO_LABEL[forma],
          icone: FORMA_PAGAMENTO_ICONE[forma],
          quantidade: pedidosForma.length,
          total: pedidosForma.reduce(
            (soma, pedido) => soma + pedido.total,
            0,
          ),
        };
      })
      .filter((item) => item.quantidade > 0);
  });

  ngOnInit(): void {
    this.carregar();
    this.configuracoes.carregarTaxaEntrega();
    this.taxaInput.set(this.configuracoes.taxaEntrega());
  }

  salvarTaxa(): void {
    const valor = Number(this.taxaInput());
    if (!Number.isFinite(valor) || valor < 0) {
      this.taxaInput.set(this.configuracoes.taxaEntrega());
      return;
    }
    const arredondado = Math.round(valor * 100) / 100;
    this.configuracoes.definirTaxaEntrega(arredondado);
    this.taxaSalva.set(true);
    setTimeout(() => this.taxaSalva.set(false), 2500);
  }

  setTaxaInput(valor: string): void {
    const numero = Number(valor);
    this.taxaInput.set(Number.isFinite(numero) ? numero : 0);
  }

  carregar(): void {
    this.carregando.set(true);
    this.pedidoService.listar().subscribe({
      next: (dados) => this.pedidos.set(dados),
      error: (err) => console.error('Erro ao carregar pedidos:', err),
      complete: () => this.carregando.set(false),
    });
  }

  aplicarPeriodo(periodo: Periodo): void {
    const hoje = new Date();
    if (periodo === 'hoje') {
      this.de.set(paraDataIso(hoje));
      this.ate.set(paraDataIso(hoje));
    } else if (periodo === 'semana') {
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 6);
      this.de.set(paraDataIso(inicio));
      this.ate.set(paraDataIso(hoje));
    } else if (periodo === 'mes') {
      this.de.set(paraDataIso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)));
      this.ate.set(paraDataIso(hoje));
    } else {
      this.de.set('');
      this.ate.set('');
    }
  }

  periodoAtivo(periodo: Periodo): boolean {
    if (periodo === 'todos') return this.de() === '' && this.ate() === '';
    if (periodo === 'hoje') {
      const hoje = paraDataIso(new Date());
      return this.de() === hoje && this.ate() === hoje;
    }
    if (periodo === 'semana') {
      const inicio = new Date();
      inicio.setDate(inicio.getDate() - 6);
      return this.de() === paraDataIso(inicio) && this.ate() === paraDataIso(new Date());
    }
    const hoje = new Date();
    return (
      this.de() === paraDataIso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)) &&
      this.ate() === paraDataIso(hoje)
    );
  }
}