import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, switchMap, timer } from 'rxjs';
import {
  PedidoService,
  PedidoRastreio,
  PedidoStatus,
} from '../../services/pedidos.service';

const STATUS_LABELS: Record<PedidoStatus, string> = {
  PENDENTE: 'Pendente',
  EM_PREPARO: 'Em preparo',
  EM_ROTA: 'Em rota',
  PRONTO: 'Pronto',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

const STATUS_CORES: Record<PedidoStatus, string> = {
  PENDENTE: '#f39c12',
  EM_PREPARO: '#3498db',
  EM_ROTA: '#8b5cf6',
  PRONTO: '#14b8a6',
  CONCLUIDO: '#27ae60',
  CANCELADO: '#e74c3c',
};

@Component({
  selector: 'app-pedido-status',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="rastreio">
      @if (carregando()) {
        <p class="status-msg">Buscando seu pedido...</p>
      } @else if (erro()) {
        <p class="status-msg erro">{{ erro() }}</p>
        <a routerLink="/cardapio" class="btn-voltar">← Voltar ao cardápio</a>
      } @else if (pedido()) {
        <div class="rastreio-card">
          <div class="rastreio-top">
            <strong>Pedido #{{ pedido()!.id.slice(0, 8).toUpperCase() }}</strong>
            <span class="badge" [style.background]="STATUS_CORES[pedido()!.status]">
              {{ STATUS_LABELS[pedido()!.status] }}
            </span>
          </div>

          <div class="passos">
            <div class="passo" [class.ativo]="posicaoStatus() >= 0">
              <span class="ponto">1</span> Recebido
            </div>
            <div class="passo" [class.ativo]="posicaoStatus() >= 1">
              <span class="ponto">2</span> Em preparo
            </div>
            <div class="passo" [class.ativo]="posicaoStatus() >= 2">
              <span class="ponto">3</span> {{ nomePasso(3) }}
            </div>
            <div class="passo" [class.ativo]="posicaoStatus() >= 3">
              <span class="ponto">4</span> Concluído
            </div>
          </div>

          <p class="info">{{ pedido()!.cliente }} · {{ pedido()!.criadoEm | date:'HH:mm' }}</p>

          <div class="recebimento">
            <p class="tipo-entrega">
              {{ pedido()!.tipoEntrega === 'ENTREGA' ? '🚚 Entrega' : '🏪 Retirada' }}
            </p>
            @if (pedido()!.tipoEntrega === 'ENTREGA') {
              <p class="detalhe">
                Endereço: <strong>{{ pedido()!.endereco }}</strong>
              </p>
            }
            @if (pedido()!.telefone) {
              <p class="detalhe">
                Contato: <strong>{{ pedido()!.telefone }}</strong>
              </p>
            }
          </div>

          <ul class="itens">
            @for (item of pedido()!.itens; track item.nome) {
              <li>
                <div class="item-info">
                  <span>{{ item.quantidade }}x {{ item.nome }}</span>
                  @if (item.removidos.length > 0) {
                    <span class="pers removido">Sem: {{ item.removidos.join(', ') }}</span>
                  }
                  @if (item.adicionados.length > 0) {
                    <span class="pers adicionado">+ {{ item.adicionados.join(', ') }}</span>
                  }
                </div>
                <span>{{ item.preco * item.quantidade | currency:'BRL' }}</span>
              </li>
            }
          </ul>

          <p class="total">
            Total: <strong>{{ pedido()!.total | currency:'BRL' }}</strong>
          </p>

          @if (pedido()!.status === 'CANCELADO') {
            <p class="obs">Este pedido foi cancelado. Fale com a casa para mais informações.</p>
          } @else if (pedido()!.status === 'PRONTO') {
            <p class="obs">Pedido pronto para retirada!</p>
          } @else if (pedido()!.status === 'CONCLUIDO') {
            <p class="obs">Pedido pronto! Bom apetite.</p>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
    .rastreio { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
    .rastreio h1 { text-align: center; font-weight: 800; margin: 0 0 24px; }
    .status-msg { text-align: center; color: var(--text-muted); background: var(--card); padding: 40px 20px; border: 1px solid var(--border); border-radius: var(--radius); }
    .status-msg.erro { color: var(--danger); }
    .btn-voltar { display: inline-block; margin-top: 16px; text-align: center; color: var(--primary); text-decoration: none; }
    .rastreio-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; box-shadow: var(--shadow-sm); }
    .rastreio-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
    .badge { color: #fff; padding: 4px 11px; border-radius: var(--radius-pill); font-size: 0.72rem; font-weight: 700; }
    .passos { display: flex; justify-content: space-between; gap: 8px; margin: 20px 0; }
    .passo { flex: 1; text-align: center; font-size: 0.8rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 6px; align-items: center; }
    .ponto { width: 26px; height: 26px; border-radius: 50%; background: var(--surface-hover); display: grid; place-items: center; font-weight: 700; font-size: 0.8rem; }
    .passo.ativo { color: var(--text); }
    .passo.ativo .ponto { background: var(--accent); color: #fff; }
    .info { color: var(--text-muted); font-size: 0.9rem; margin: 0 0 12px; }
    .itens { list-style: none; margin: 0 0 12px; padding: 0; border-top: 1px solid var(--border); }
    .itens li { display: flex; justify-content: space-between; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 0.9rem; }
    .item-info { display: flex; flex-direction: column; min-width: 0; }
    .pers { font-size: 0.78rem; font-weight: normal; align-self: flex-start; margin-top: 2px; }
    .pers.removido { color: var(--danger); }
    .pers.adicionado { color: var(--accent-dark); }
    .recebimento { border: 1px solid var(--border); border-radius: 12px; padding: 10px 14px; margin-bottom: 14px; background: var(--surface-hover); }
    .tipo-entrega { margin: 0 0 4px; font-weight: 800; font-size: 0.95rem; }
    .detalhe { margin: 2px 0; font-size: 0.85rem; color: var(--text-muted); }
    .total { margin: 0; font-weight: 600; }
    .obs { margin-top: 12px; font-size: 0.85rem; color: var(--text-muted); }
    `,
  ],
})
export class PedidoStatusComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly pedidoService = inject(PedidoService);

  readonly STATUS_LABELS = STATUS_LABELS;
  readonly STATUS_CORES = STATUS_CORES;

  pedido = signal<PedidoRastreio | null>(null);
  carregando = signal(true);
  erro = signal<string | null>(null);

  private readonly assinaturas = new Subscription();

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.erro.set('Pedido não informado.');
      this.carregando.set(false);
      return;
    }

    // Carrega imediatamente e depois atualiza a cada 6s
    const fluxo = timer(0, 6000).pipe(
      switchMap(() => this.pedidoService.rastrear(id)),
    );
    this.assinaturas.add(
      fluxo.subscribe({
        next: (dados) => {
          this.pedido.set(dados);
          this.carregando.set(false);
        },
        error: () => {
          this.carregando.set(false);
          this.erro.set('Não foi possível encontrar este pedido.');
        },
      }),
    );
  }

  ngOnDestroy(): void {
    this.assinaturas.unsubscribe();
  }

  posicaoStatus(): number {
    const ordem: Record<PedidoStatus, number> = {
      PENDENTE: 0,
      EM_PREPARO: 1,
      EM_ROTA: 2,
      PRONTO: 2,
      CONCLUIDO: 3,
      CANCELADO: 0,
    };
    const status = this.pedido()?.status;
    return status ? ordem[status] : 0;
  }

  // Passo 3: "Em rota" para entregas, "Pronto" para retiradas
  nomePasso(posicao: number): string {
    if (posicao === 3) {
      return this.pedido()?.tipoEntrega === 'ENTREGA' ? 'Em rota' : 'Pronto';
    }
    return posicao === 1 ? 'Recebido' : posicao === 2 ? 'Em preparo' : 'Concluído';
  }
}