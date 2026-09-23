import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { PedidoService, Pedido, PedidoStatus, FormaPagamento, FORMA_PAGAMENTO_LABEL, formatarTelefone as formatarTelefoneBr } from '../../services/pedidos.service';
import { RealtimeService } from '../../services/realtime.service';

const STATUS_CORES: Record<PedidoStatus, string> = {
  PENDENTE: '#f39c12',
  EM_PREPARO: '#3498db',
  EM_ROTA: '#8b5cf6',
  PRONTO: '#14b8a6',
  CONCLUIDO: '#27ae60',
  CANCELADO: '#e74c3c',
};

const STATUS_LABELS: Record<PedidoStatus, string> = {
  PENDENTE: 'Pendente',
  EM_PREPARO: 'Em preparo',
  EM_ROTA: 'Em rota',
  PRONTO: 'Pronto',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

@Component({
  selector: 'app-admin-pedidos',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="pedidos-section">
      <div class="pedidos-header">
        <h2>Pedidos</h2>
        <button class="btn-refresh" (click)="carregar()">Atualizar</button>
      </div>

      <div class="filtros">
        <button
          class="filtro-chip"
          [class.ativo]="filtroStatus() === null"
          (click)="filtrarPorStatus(null)"
        >
          Todos
        </button>
        @for (status of filtroOptions; track status) {
          <button
            class="filtro-chip"
            [class.ativo]="filtroStatus() === status"
            (click)="filtrarPorStatus(status)"
          >
            <span class="dot" [style.background]="STATUS_CORES[status]"></span>
            {{ STATUS_LABELS[status] }}
          </button>
        }
      </div>

      @if (carregando()) {
        <p>Carregando pedidos...</p>
      } @else if (pedidosFiltrados().length === 0) {
        <p>
          {{ pedidos().length === 0 ? 'Nenhum pedido por enquanto.' : 'Nenhum pedido com esse status.' }}
        </p>
      } @else {
        <div class="pedidos-list">
          @for (pedido of pedidosFiltrados(); track pedido.id) {
            <div class="pedido-card">
              <div class="pedido-top">
                <div>
                  <strong>#{{ pedido.id.slice(0, 8).toUpperCase() }}</strong>
                  <span class="badge" [style.background]="STATUS_CORES[pedido.status]">
                    {{ STATUS_LABELS[pedido.status] }}
                  </span>
                </div>
              </div>

              <p class="pedido-info">
                <strong>{{ pedido.cliente }}</strong>
                <span class="tipo-tag">{{ pedido.tipoEntrega === 'ENTREGA' ? '🚚 Entrega' : '🏪 Retirada' }}</span>
                · {{ pedido.createdAt | date:'dd/MM/yyyy HH:mm' }}
              </p>

              @if (pedido.tipoEntrega === 'ENTREGA' && pedido.endereco) {
                <p class="dados-entrega">📍 {{ pedido.endereco }}</p>
              }
              @if (pedido.telefone) {
                <p class="dados-entrega">📞 {{ formatarTelefone(pedido.telefone) }}</p>
              }
              @if (pedido.taxaEntrega > 0) {
                <p class="dados-entrega taxa">Taxa de entrega: {{ pedido.taxaEntrega | currency:'BRL' }}</p>
              }
              <p class="dados-entrega pag">
                💵 {{ rotuloPagamento(pedido.formaPagamento) }}
                @if (pedido.formaPagamento === 'DINHEIRO' && trocoDevolver(pedido) > 0) {
                  · Troco: {{ trocoDevolver(pedido) | currency:'BRL' }}
                  (pagando com {{ pedido.trocoPara | currency:'BRL' }})
                } @else if (pedido.formaPagamento === 'DINHEIRO' && pedido.trocoPara != null) {
                  · Pagará exato {{ pedido.trocoPara | currency:'BRL' }}
                }
              </p>

              <ul class="itens">
                @for (item of pedido.itens; track item.id) {
                  <li>
                    <span class="item-nome">
                      {{ item.quantidade }}x {{ item.produto.nome }}
                      @if (listaRemovidos(item).length > 0) {
                        <span class="pers-tag removido">sem {{ listaRemovidos(item).join(', ') }}</span>
                      }
                      @if (listaAdicionados(item).length > 0) {
                        <span class="pers-tag adicionado">+ {{ agrupar(this.listaAdicionados(item)) }}</span>
                      }
                    </span>
                    <span>{{ item.preco * item.quantidade | currency:'BRL' }}</span>
                  </li>
                }
              </ul>

              <div class="pedido-bottom">
                <strong>Total: {{ pedido.total | currency:'BRL' }}</strong>
                <select [value]="pedido.status" (change)="mudarStatus(pedido.id, $event)">
                  @for (status of statusPara(pedido); track status) {
                    <option [value]="status">{{ STATUS_LABELS[status] }}</option>
                  }
                </select>
              </div>
            </div>
          }
        </div>
      }
    </section>

    @if (confirmacao(); as item) {
      <div class="modal-overlay" (click)="cancelarConfirmacao()">
        <div class="modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="modal-cancelar-titulo">
          <h3 id="modal-cancelar-titulo">Cancelar pedido</h3>
          <p>
            Tem certeza que deseja cancelar o pedido
            <strong>#{{ item.pedido.id.slice(0, 8).toUpperCase() }}</strong> de
            <strong>{{ item.pedido.cliente }}</strong>?
          </p>
          <p class="modal-aviso">O cliente será informado e o pedido não seguirá para produção.</p>
          <div class="modal-acoes">
            <button class="btn-voltar-confirmacao" (click)="cancelarConfirmacao()">Voltar</button>
            <button class="btn-confirmar-cancelamento" (click)="confirmarCancelamento()">Cancelar pedido</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .pedidos-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
    .pedidos-header h2 { margin: 0; font-size: 1.25rem; font-weight: 800; letter-spacing: -0.015em; }
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
    .filtros { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .filtro-chip {
      display: inline-flex;
      align-items: center;
      gap: 7px;
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
    .filtro-chip .dot { width: 8px; height: 8px; border-radius: 50%; }
    .pedidos-section > p,
    .pedidos-list > p {
      text-align: center;
      color: var(--text-muted);
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 48px 20px;
      box-shadow: var(--shadow-sm);
    }
    .pedidos-list { display: flex; flex-direction: column; gap: 16px; }
    .pedido-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 18px;
      box-shadow: var(--shadow-sm);
      transition: box-shadow var(--transition-slow), border-color var(--transition);
    }
    .pedido-card:hover { box-shadow: var(--shadow-md); border-color: color-mix(in srgb, var(--primary) 20%, var(--border)); }
    .pedido-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .pedido-top > div { display: flex; align-items: center; }
    .pedido-top strong { font-size: 0.95rem; }
    .badge { color: #fff; padding: 4px 11px; border-radius: var(--radius-pill); font-size: 0.72rem; font-weight: 700; margin-left: 8px; letter-spacing: 0.4px; }
    .pedido-info { margin: 6px 0 0; color: var(--text-muted); font-size: 0.9rem; display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
    .tipo-tag {
      display: inline-block;
      padding: 3px 10px;
      border-radius: var(--radius-pill);
      font-size: 0.72rem;
      font-weight: 700;
      background: var(--primary-light);
      color: var(--primary-dark);
    }
    .dados-entrega { margin: 2px 0 0; font-size: 0.85rem; color: var(--text-muted); }
    .dados-entrega.taxa { color: var(--accent-dark); font-weight: 600; }
    .itens { list-style: none; margin: 10px 0; padding: 0; border-top: 1px solid var(--border); }
    .itens li { display: flex; justify-content: space-between; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 0.9rem; }
    .itens li:last-child { border-bottom: none; }
    .item-nome { display: flex; flex-direction: column; min-width: 0; }
    .pers-tag { font-size: 0.75rem; font-weight: normal; align-self: flex-start; margin-top: 2px; }
    .pers-tag.removido { color: var(--danger); }
    .pers-tag.adicionado { color: var(--accent-dark); }
    .pedido-bottom { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 4px; }
    .pedido-bottom select {
      padding: 8px 12px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--card);
      color: var(--text);
      outline: none;
      cursor: pointer;
      font-size: 0.85rem;
      transition: border-color var(--transition), box-shadow var(--transition);
    }
    .pedido-bottom select:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-light); }
    .modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 200;
      background: var(--overlay);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: modal-fade var(--transition-slow);
    }
    .modal {
      width: 100%;
      max-width: 420px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 20px;
      box-shadow: var(--shadow-lg);
      padding: 26px 24px 22px;
      animation: modal-pop var(--transition-slow);
    }
    .modal h3 { margin: 0 0 10px; font-size: 1.15rem; font-weight: 800; letter-spacing: -0.015em; }
    .modal p { margin: 0 0 6px; color: var(--text-muted); font-size: 0.92rem; line-height: 1.55; }
    .modal p strong { color: var(--text); }
    .modal-aviso { color: var(--danger) !important; font-weight: 600; }
    .modal-acoes { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
    .btn-voltar-confirmacao, .btn-confirmar-cancelamento {
      padding: 10px 18px;
      border-radius: 12px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.88rem;
      transition: filter var(--transition), transform var(--transition), box-shadow var(--transition);
    }
    .btn-voltar-confirmacao { background: var(--surface-hover); color: var(--text-muted); border: 1px solid var(--border); }
    .btn-voltar-confirmacao:hover { color: var(--text); border-color: var(--text-muted); }
    .btn-voltar-confirmacao:active { transform: scale(0.97); }
    .btn-confirmar-cancelamento {
      background: linear-gradient(135deg, var(--danger), #b91c1c);
      color: #fff;
      border: none;
      box-shadow: 0 4px 12px color-mix(in srgb, var(--danger) 30%, transparent);
    }
    .btn-confirmar-cancelamento:hover { filter: brightness(1.08); box-shadow: 0 6px 16px color-mix(in srgb, var(--danger) 40%, transparent); }
    .btn-confirmar-cancelamento:active { transform: scale(0.97); }
    @keyframes modal-fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes modal-pop {
      from { opacity: 0; transform: translateY(14px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `],
})
export class AdminPedidosComponent implements OnInit {
  private readonly pedidoService = inject(PedidoService);
  private readonly realtimeService = inject(RealtimeService);

  readonly STATUS_LABELS = STATUS_LABELS;
  readonly STATUS_CORES = STATUS_CORES;
  // Filtros globais: cobrem pedidos de entrega (Em rota) e de retirada (Pronto)
  readonly filtroOptions: PedidoStatus[] = [
    'PENDENTE',
    'EM_PREPARO',
    'EM_ROTA',
    'PRONTO',
    'CONCLUIDO',
    'CANCELADO',
  ];

  pedidos = signal<Pedido[]>([]);
  carregando = signal(false);
  filtroStatus = signal<PedidoStatus | null>(null);
  // Pedido aguardando confirmação de cancelamento
  confirmacao = signal<{ pedido: Pedido; status: PedidoStatus } | null>(null);

  // Lista já filtrada pelo status selecionado (aplica automaticamente
  // também nas atualizações em tempo real)
  pedidosFiltrados = computed(() => {
    const status = this.filtroStatus();
    if (!status) return this.pedidos();
    return this.pedidos().filter((pedido) => pedido.status === status);
  });

  private readonly destruicoes = new Subscription();

  ngOnInit(): void {
    this.carregar();
    // Recebe pedidos novos, atualizações de status e remoções em tempo real
    this.realtimeService.conectar();
    this.destruicoes.add(
      this.realtimeService.pedidoCriado$.subscribe((pedido) =>
        this.pedidos.update((lista) => [pedido, ...lista]),
      ),
    );
    this.destruicoes.add(
      this.realtimeService.pedidoAtualizado$.subscribe((pedido) =>
        this.pedidos.update((lista) =>
          lista.map((p) => (p.id === pedido.id ? pedido : p)),
        ),
      ),
    );
    this.destruicoes.add(
      this.realtimeService.pedidoRemovido$.subscribe((id) =>
        this.pedidos.update((lista) => lista.filter((p) => p.id !== id)),
      ),
    );
  }

  ngOnDestroy(): void {
    this.destruicoes.unsubscribe();
  }

  filtrarPorStatus(status: PedidoStatus | null): void {
    this.filtroStatus.set(status);
  }

  // Opções do status por pedido: retirada não tem "Em rota" (usa "Pronto");
  // entrega não usa "Pronto".
  statusPara(pedido: Pedido): PedidoStatus[] {
    return pedido.tipoEntrega === 'RETIRADA'
      ? ['PENDENTE', 'EM_PREPARO', 'PRONTO', 'CONCLUIDO', 'CANCELADO']
      : ['PENDENTE', 'EM_PREPARO', 'EM_ROTA', 'CONCLUIDO', 'CANCELADO'];
  }

  private parseLista(valor: string): string[] {
    try {
      const parsed = JSON.parse(valor);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  listaRemovidos(item: Pedido['itens'][number]): string[] {
    return this.parseLista(item.removidos);
  }

  listaAdicionados(item: Pedido['itens'][number]): string[] {
    return this.parseLista(item.adicionados);
  }

  agrupar(lista: string[]): string {
    const contagem = new Map<string, number>();
    for (const nome of lista) {
      contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
    }
    return [...contagem.entries()]
      .map(([nome, qtd]) => (qtd > 1 ? `${qtd}x ${nome}` : nome))
      .join(', ');
  }

  formatarTelefone(valor: string | null | undefined): string {
    return formatarTelefoneBr(valor);
  }

  rotuloPagamento(valor: FormaPagamento): string {
    return FORMA_PAGAMENTO_LABEL[valor];
  }

  // Quanto de troco devolver (trocoPara - total), ou 0 quando não se aplica
  trocoDevolver(pedido: Pedido): number {
    if (pedido.formaPagamento !== 'DINHEIRO' || pedido.trocoPara == null) {
      return 0;
    }
    return Math.max(0, pedido.trocoPara - pedido.total);
  }

  carregar(): void {
    this.carregando.set(true);
    this.pedidoService.listar().subscribe({
      next: (dados) => this.pedidos.set(dados),
      error: (err) => {
        console.error('Erro ao carregar pedidos:', err);
        this.carregando.set(false);
      },
      complete: () => this.carregando.set(false),
    });
  }

  mudarStatus(pedidoId: string, event: Event): void {
    const status = (event.target as HTMLSelectElement).value as PedidoStatus;
    const pedido = this.pedidos().find((p) => p.id === pedidoId);
    // Cancelar pedido exige confirmação
    if (status === 'CANCELADO' && pedido) {
      this.confirmacao.set({ pedido, status });
      return;
    }
    this.aplicarStatus(pedidoId, status);
  }

  private aplicarStatus(pedidoId: string, status: PedidoStatus): void {
    this.pedidoService.atualizarStatus(pedidoId, status).subscribe({
      next: (atualizado) =>
        this.pedidos.update((lista) =>
          lista.map((p) => (p.id === pedidoId ? atualizado : p)),
        ),
      error: (err) => console.error('Erro ao atualizar status:', err),
    });
  }

  cancelarConfirmacao(): void {
    this.confirmacao.set(null);
  }

  confirmarCancelamento(): void {
    const item = this.confirmacao();
    if (!item) return;
    this.confirmacao.set(null);
    this.aplicarStatus(item.pedido.id, item.status);
  }
}