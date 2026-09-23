import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Produto, ProdutoService } from '../../services/produto.service';
import type { Pedido } from '../../services/pedidos.service';
import { AdminNotificacoesService } from '../../services/admin-notificacoes.service';
import { AdminHomeComponent, SecaoAdmin } from '../../components/admin-home/admin-home.component';
import { AdminCadastroComponent } from '../../components/admin-cadastro/admin-cadastro.component';
import { AdminProdutosComponent } from '../../components/admin-produtos/admin-produtos.component';
import { AdminPedidosComponent } from '../../components/admin-pedidos/admin-pedidos.component';
import { AdminIngredientesComponent } from '../../components/admin-ingredientes/admin-ingredientes.component';
import { AdminCategoriasComponent } from '../../components/admin-categorias/admin-categorias.component';
import { AdminCardapioComponent } from '../../components/admin-cardapio/admin-cardapio.component';
import { AdminFaturamentoComponent } from '../../components/admin-faturamento/admin-faturamento.component';
import { AdminPerfilComponent } from '../../components/admin-perfil/admin-perfil.component';

// Shell do painel administrativo: navega entre as seções (cada uma em um componente)
@Component({
  selector: 'app-admin-screen',
  standalone: true,
  imports: [
    CommonModule,
    AdminHomeComponent,
    AdminCadastroComponent,
    AdminProdutosComponent,
    AdminPedidosComponent,
    AdminIngredientesComponent,
    AdminCategoriasComponent,
    AdminCardapioComponent,
    AdminFaturamentoComponent,
    AdminPerfilComponent,
  ],
  template: `
    <section class="admin-screen">
      @switch (secao()) {
        @case ('inicio') {
          <app-admin-home
            [novosPedidos]="notificacoes.novosPedidos().length"
            (navegar)="navegar($event)"
          ></app-admin-home>
        }
        @case ('cadastro') {
          <button class="btn-voltar" (click)="voltar()">← Voltar</button>
          <app-admin-cadastro
            [produtoParaEdicao]="produtoEmEdicao()"
            (salvo)="aposSalvar()"
            (cancelado)="aposCancelar()"
          ></app-admin-cadastro>
        }
        @case ('produtos') {
          <button class="btn-voltar" (click)="voltar()">← Voltar</button>
          <app-admin-produtos (editar)="editarProduto($event)"></app-admin-produtos>
        }
        @case ('pedidos') {
          <button class="btn-voltar" (click)="voltar()">← Voltar</button>
          <app-admin-pedidos></app-admin-pedidos>
        }
        @case ('ingredientes') {
          <button class="btn-voltar" (click)="voltar()">← Voltar</button>
          <app-admin-ingredientes></app-admin-ingredientes>
        }
        @case ('categorias') {
          <button class="btn-voltar" (click)="voltar()">← Voltar</button>
          <app-admin-categorias></app-admin-categorias>
        }
        @case ('cardapio') {
          <button class="btn-voltar" (click)="voltar()">← Voltar</button>
          <app-admin-cardapio></app-admin-cardapio>
        }
        @case ('faturamento') {
          <button class="btn-voltar" (click)="voltar()">← Voltar</button>
          <app-admin-faturamento></app-admin-faturamento>
        }
        @case ('perfil') {
          <button class="btn-voltar" (click)="voltar()">← Voltar</button>
          <app-admin-perfil></app-admin-perfil>
        }
      }

      @if (ultimoNovoPedido(); as pedido) {
        <div class="novo-pedido-toast" role="status" aria-live="polite">
          <div class="npt-icone" aria-hidden="true">🔔</div>
          <div class="npt-conteudo">
            <strong>
              {{ notificacoes.novosPedidos().length === 1
                ? 'Novo pedido!'
                : notificacoes.novosPedidos().length + ' novos pedidos!' }}
            </strong>
            <span>{{ pedido.cliente }} · {{ pedido.total | currency:'BRL' }}
              @if (pedido.tipoEntrega === 'ENTREGA') {
                <span class="npt-tipo">🚚</span>
              }
            </span>
          </div>
          <button class="npt-ver" (click)="verPedidos()">Ver pedidos</button>
          <button class="npt-fechar" (click)="dispensarNovos()" aria-label="Fechar">✕</button>
        </div>
      }
    </section>
  `,
  styles: [`
    .novo-pedido-toast {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 300;
      display: flex;
      align-items: center;
      gap: 10px;
      max-width: 420px;
      background: var(--card);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: var(--shadow-lg);
      padding: 12px 14px;
      animation: npt-pop var(--transition-slow);
    }
    @keyframes npt-pop {
      from { opacity: 0; transform: translateY(16px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .npt-icone { font-size: 1.3rem; }
    .npt-conteudo { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
    .npt-conteudo strong { font-size: 0.95rem; font-weight: 800; }
    .npt-conteudo span { font-size: 0.8rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .npt-tipo { margin-left: 4px; }
    .npt-ver {
      padding: 8px 14px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.82rem;
      font-weight: 700;
      color: #fff;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      transition: filter var(--transition), transform var(--transition);
    }
    .npt-ver:hover { filter: brightness(1.08); }
    .npt-ver:active { transform: scale(0.96); }
    .npt-fechar {
      width: 26px;
      height: 26px;
      border: none;
      border-radius: 50%;
      background: var(--surface-hover);
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.8rem;
      line-height: 1;
      transition: background var(--transition), color var(--transition);
    }
    .npt-fechar:hover { background: var(--border); color: var(--text); }
  `],
})
export class AdminScreenComponent implements OnInit {
  private readonly produtoService = inject(ProdutoService);
  readonly notificacoes = inject(AdminNotificacoesService);

  secao = signal<SecaoAdmin>('inicio');
  secaoOrigem = signal<SecaoAdmin>('inicio');
  // Produto escolhido para edição na tela de cadastro
  produtoEmEdicao = signal<Produto | null>(null);

  ngOnInit(): void {
    this.produtoService.loadCategorias();
    this.produtoService.loadProdutos();
    this.notificacoes.iniciar();
  }

  navegar(secao: SecaoAdmin): void {
    if (secao === 'pedidos') {
      this.notificacoes.marcarComoVistos();
    }
    this.secaoOrigem.set(this.secao());
    this.secao.set(secao);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  ultimoNovoPedido(): Pedido | null {
    const lista = this.notificacoes.novosPedidos();
    return lista.length > 0 ? lista[lista.length - 1] : null;
  }

  verPedidos(): void {
    this.notificacoes.marcarComoVistos();
    this.navegar('pedidos');
  }

  dispensarNovos(): void {
    this.notificacoes.marcarComoVistos();
  }

  voltar(): void {
    this.navegar('inicio');
  }

  editarProduto(produto: Produto): void {
    if (!produto.id) return;
    this.produtoEmEdicao.set(produto);
    this.navegar('cadastro');
  }

  aposSalvar(): void {
    this.produtoService.recarregarProdutos();
    this.aposCancelar();
    this.navegar('produtos');
  }

  aposCancelar(): void {
    this.produtoEmEdicao.set(null);
    this.navegar(this.secaoOrigem());
  }
}