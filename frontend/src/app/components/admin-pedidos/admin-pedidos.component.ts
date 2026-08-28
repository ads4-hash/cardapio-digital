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
    .pedidos-section p { text-align: center; color: var(--text-muted, #888); }
    .pedidos-list { display: flex; flex-direction: column; gap: 12px; }
    .pedido-card { border: 1px solid var(--border, #eee); border-radius: var(--radius, 14px); padding: 14px; background: var(--card, white); box-shadow: var(--shadow-sm); }
    .pedido-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .badge { color: white; padding: 4px 11px; border-radius: 999px; font-size: 0.72rem; font-weight: 600; margin-left: 8px; letter-spacing: 0.3px; }
    .pedido-info { margin: 4px 0; color: var(--text-muted, #555); font-size: 0.9rem; }
    .itens { list-style: none; margin: 8px 0; padding: 0; border-top: 1px solid var(--border, #f0f0f0); }
    .itens li { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #f8f9fa; font-size: 0.9rem; }
    .item-nome { display: flex; flex-direction: column; }
    .pers-tag { font-size: 0.75rem; font-weight: normal; align-self: flex-start; margin-top: 2px; }
    .pers-tag.removido { color: #e74c3c; }
    .pers-tag.adicionado { color: var(--accent-dark, #16a34a); }
    .pedido-bottom { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .pedido-bottom select { padding: 7px 9px; border-radius: 8px; border: 1px solid var(--border, #e5e7eb); background: white; outline: none; cursor: pointer; }
    .btn-remove { padding: 6px 11px; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.8rem; font-weight: 600; transition: filter 0.15s; }
    .btn-remove:hover { filter: brightness(1.1); }
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