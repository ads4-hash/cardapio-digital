import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PedidoService, Pedido } from '../../services/pedidos.service';
import { ConfiguracoesService } from '../../services/configuracoes.service';

type Periodo = 'hoje' | 'semana' | 'mes' | 'todos';

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
  template: `
    <section class="faturamento">
      <div class="faturamento-top">
        <h2>Faturamento</h2>
        <button class="btn-refresh" (click)="carregar()">Atualizar</button>
      </div>

      <div class="card-taxa">
        <div class="card-taxa-info">
          <strong>Taxa de entrega</strong>
          <small>
            Valor cobrado quando o cliente escolhe "Entrega" no carrinho.
            Atual: {{ configuracoes.taxaEntrega() > 0 ? (configuracoes.taxaEntrega() | currency:'BRL') : 'Grátis' }}
          </small>
        </div>
        <div class="card-taxa-controles">
          <input
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
          <input type="date" [value]="de()" (change)="de.set($any($event.target).value)" />
        </label>
        <label>
          Até
          <input type="date" [value]="ate()" (change)="ate.set($any($event.target).value)" />
        </label>
      </div>

      @if (carregando()) {
        <p class="vazio">Carregando pedidos...</p>
      } @else if (filtrados().length === 0) {
        <p class="vazio">Nenhum pedido concluído neste período.</p>
      } @else {
        <div class="resumo">
          <div class="resumo-item">
            <span>Pedidos concluídos</span>
            <strong>{{ filtrados().length }}</strong>
          </div>
          <div class="resumo-item destaque">
            <span>Faturamento (soma)</span>
            <strong>{{ totalFaturamento() | currency:'BRL' }}</strong>
          </div>
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
    .faturamento-top h2 { margin: 0; font-size: 1.25rem; font-weight: 800; letter-spacing: -0.015em; }
    .btn-refresh {
      padding: 9px 16px;
      background: var(--surface-hover);
      color: var(--text-muted);
      border: 1px solid var(--border);
      border-radius: var(--radius-pill);
      cursor: pointer;
      font-weight: 600;
      font-size: 0.85rem;
      transition: color var(--transition), border-color var(--transition), box-shadow var(--transition), transform var(--transition);
    }
    .btn-refresh:hover { color: var(--primary); border-color: var(--primary); box-shadow: var(--shadow-sm); }
    .btn-refresh:active { transform: scale(0.97); }
    .filtros { display: flex; flex-wrap: wrap; gap: 8px; }
    .filtro-chip {
      padding: 8px 14px;
      background: var(--card);
      color: var(--text-muted);
      border: 1px solid var(--border);
      border-radius: var(--radius-pill);
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
      transition: color var(--transition), border-color var(--transition), background var(--transition), box-shadow var(--transition), transform var(--transition);
    }
    .filtro-chip:hover { color: var(--primary); border-color: var(--primary); box-shadow: var(--shadow-sm); }
    .filtro-chip:active { transform: scale(0.97); }
    .filtro-chip.ativo {
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: #fff;
      border-color: transparent;
      box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 30%, transparent);
    }
    .filtro-datas { display: flex; gap: 12px; flex-wrap: wrap; }
    .filtro-datas label { display: flex; flex-direction: column; gap: 5px; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); }
    .filtro-datas input {
      padding: 9px 12px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--card);
      color: var(--text);
      outline: none;
      font-size: 0.88rem;
      transition: border-color var(--transition), box-shadow var(--transition);
    }
    .filtro-datas input:focus { border-color: var(--primary); box-shadow: 0 0 0 4px var(--primary-light); }
    .resumo { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    .resumo-item {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      box-shadow: var(--shadow-sm);
    }
    .resumo-item span { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; }
    .resumo-item strong { font-size: 1.3rem; }
    .resumo-item.destaque { background: linear-gradient(135deg, var(--accent), var(--accent-dark)); border: none; color: #fff; box-shadow: 0 8px 20px color-mix(in srgb, var(--accent) 35%, transparent); }
    .resumo-item.destaque span { color: rgba(255, 255, 255, 0.85); }
    .tabela {
      width: 100%;
      border-collapse: collapse;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
      font-size: 0.9rem;
    }
    .tabela th, .tabela td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border); }
    .tabela thead th { background: var(--surface-hover); color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; }
    .tabela tbody tr:last-child td { border-bottom: none; }
    .tabela tbody tr:hover { background: var(--surface-hover); }
    .alinha-direita { text-align: right; }
    .vazio { text-align: center; color: var(--text-muted); background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 40px 20px; box-shadow: var(--shadow-sm); }
    .card-taxa {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px 18px;
      box-shadow: var(--shadow-sm);
    }
    .card-taxa-info { display: flex; flex-direction: column; gap: 3px; }
    .card-taxa-info small { color: var(--text-muted); font-size: 0.82rem; }
    .card-taxa-controles { display: flex; align-items: center; gap: 8px; }
    .card-taxa-controles input {
      width: 130px;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--card);
      color: var(--text);
      outline: none;
      font-size: 0.95rem;
      transition: border-color var(--transition), box-shadow var(--transition);
    }
    .card-taxa-controles input:focus { border-color: var(--accent-dark); box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 18%, transparent); }
    .btn-salvar-taxa {
      padding: 10px 18px;
      background: linear-gradient(135deg, var(--accent), var(--accent-dark));
      color: #fff;
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