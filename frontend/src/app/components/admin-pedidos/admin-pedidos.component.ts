import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PedidoService, Pedido, PedidoStatus } from '../../services/pedidos.service';

const STATUS_CORES: Record<PedidoStatus, string> = {
  PENDENTE: '#f39c12',
  EM_PREPARO: '#3498db',
  CONCLUIDO: '#27ae60',
  CANCELADO: '#e74c3c',
};

const STATUS_LABELS: Record<PedidoStatus, string> = {
  PENDENTE: 'Pendente',
  EM_PREPARO: 'Em preparo',
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

      @if (carregando()) {
        <p>Carregando pedidos...</p>
      } @else if (pedidos().length === 0) {
        <p>Nenhum pedido por enquanto.</p>
      } @else {
        <div class="pedidos-list">
          @for (pedido of pedidos(); track pedido.id) {
            <div class="pedido-card">
              <div class="pedido-top">
                <div>
                  <strong>#{{ pedido.id.slice(0, 8).toUpperCase() }}</strong>
                  <span class="badge" [style.background]="STATUS_CORES[pedido.status]">
                    {{ STATUS_LABELS[pedido.status] }}
                  </span>
                </div>
                <button class="btn-remove" (click)="excluir(pedido.id)">Excluir</button>
              </div>

              <p class="pedido-info">
                <strong>{{ pedido.cliente }}</strong>
                <span *ngIf="pedido.mesa"> · Mesa {{ pedido.mesa }}</span>
                · {{ pedido.createdAt | date:'dd/MM/yyyy HH:mm' }}
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
                        <span class="pers-tag adicionado">+ {{ listaAdicionados(item).join(', ') }}</span>
                      }
                    </span>
                    <span>{{ item.preco * item.quantidade | currency:'BRL' }}</span>
                  </li>
                }
              </ul>

              <div class="pedido-bottom">
                <strong>Total: {{ pedido.total | currency:'BRL' }}</strong>
                <select [value]="pedido.status" (change)="mudarStatus(pedido.id, $event)">
                  @for (status of statusOptions; track status) {
                    <option [value]="status">{{ STATUS_LABELS[status] }}</option>
                  }
                </select>
              </div>
            </div>
          }
        </div>
      }
    </section>
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
    .pedido-info { margin: 6px 0; color: var(--text-muted); font-size: 0.9rem; }
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
    .btn-remove {
      padding: 7px 12px;
      background: var(--danger);
      color: #fff;
      border: none;
      border-radius: 9px;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 600;
      transition: filter var(--transition), transform var(--transition);
    }
    .btn-remove:hover { filter: brightness(1.1); }
    .btn-remove:active { transform: scale(0.95); }
  `],
})
export class AdminPedidosComponent implements OnInit {
  private readonly pedidoService = inject(PedidoService);

  readonly STATUS_LABELS = STATUS_LABELS;
  readonly STATUS_CORES = STATUS_CORES;
  readonly statusOptions: PedidoStatus[] = [
    'PENDENTE',
    'EM_PREPARO',
    'CONCLUIDO',
    'CANCELADO',
  ];

  pedidos = signal<Pedido[]>([]);
  carregando = signal(false);

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

  ngOnInit(): void {
    this.carregar();
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
    this.pedidoService.atualizarStatus(pedidoId, status).subscribe({
      next: (atualizado) =>
        this.pedidos.update((pedidos) =>
          pedidos.map((p) => (p.id === pedidoId ? atualizado : p)),
        ),
      error: (err) => console.error('Erro ao atualizar status:', err),
    });
  }

  excluir(pedidoId: string): void {
    if (!confirm('Deseja excluir este pedido?')) return;
    this.pedidoService.excluir(pedidoId).subscribe({
      next: () =>
        this.pedidos.update((pedidos) =>
          pedidos.filter((p) => p.id !== pedidoId),
        ),
      error: (err) => console.error('Erro ao excluir pedido:', err),
    });
  }
}