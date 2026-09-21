import { Component, inject, OnInit, signal } from '@angular/core';
import { Produto, ProdutoService } from '../../services/produto.service';
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
          <app-admin-home (navegar)="navegar($event)"></app-admin-home>
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
    </section>
  `,
})
export class AdminScreenComponent implements OnInit {
  private readonly produtoService = inject(ProdutoService);

  secao = signal<SecaoAdmin>('inicio');
  // Produto escolhido para edição na tela de cadastro
  produtoEmEdicao = signal<Produto | null>(null);

  ngOnInit(): void {
    this.produtoService.loadCategorias();
    this.produtoService.loadProdutos();
  }

  navegar(secao: SecaoAdmin): void {
    this.secao.set(secao);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
  }

  aposCancelar(): void {
    this.produtoEmEdicao.set(null);
  }
}