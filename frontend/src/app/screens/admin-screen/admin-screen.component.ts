import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ProdutoService, Produto } from '../../services/produto.service';
import { CategoriasTabsComponent } from '../../components/categorias-tabs/categorias-tabs.component';
import { ProdutoCardComponent } from '../../components/produto-card/produto-card.component';

@Component({
  selector: 'app-admin-screen',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CategoriasTabsComponent,
    ProdutoCardComponent,
  ],
  template: `
    <section class="admin-form">
      <h2>{{ editando ? 'Editar Produto' : 'Cadastrar Novo Produto' }}</h2>

      <form (ngSubmit)="salvar()">
        <div>
          <label for="nome">Nome do Produto:</label>
          <input
            type="text"
            id="nome"
            name="nome"
            [(ngModel)]="novoProduto.nome"
            placeholder="Ex: X-Salada"
            required
          />
        </div>

        <div>
          <label for="categoria">Categoria:</label>
          <select
            id="categoria"
            name="categoria"
            [(ngModel)]="novoProduto.categoriaId"
            required
          >
            <option value="" disabled>Selecione uma categoria</option>
            @for (cat of produtoService.categorias(); track cat.id) {
              <option [value]="cat.id">{{ cat.nome }}</option>
            }
          </select>
        </div>

        <div>
          <label for="descricao">Descrição:</label>
          <textarea
            id="descricao"
            name="descricao"
            [(ngModel)]="novoProduto.descricao"
            placeholder="Ex: Pão, hambúrguer 180g, queijo, alface e tomate"
            rows="3"
          ></textarea>
        </div>

        <div>
          <label for="preco">Preço (R$):</label>
          <input
            type="number"
            id="preco"
            name="preco"
            step="0.01"
            [(ngModel)]="novoProduto.preco"
            required
          />
        </div>

        <button type="submit" class="btn-submit" [disabled]="carregandoCadastro">
          {{ editando ? (carregandoCadastro ? 'Salvando...' : 'Salvar Alterações') : (carregandoCadastro ? 'Cadastrando...' : 'Cadastrar Produto') }}
        </button>
        @if (editando) {
          <button type="button" class="btn-cancel" (click)="cancelarEdicao()">Cancelar</button>
        }
      </form>
    </section>

    <app-categorias-tabs (onFiltroChange)="onFiltroChange($event)"></app-categorias-tabs>

    <section class="cardapio">
      @if (produtoService.carregandoProdutos()) {
        <p>Carregando produtos...</p>
      } @else if (produtosFiltrados().length === 0) {
        <p>Nenhum produto encontrado.</p>
      } @else {
        <div class="grid">
          @for (produto of produtosFiltrados(); track produto.id) {
            <app-produto-card
              [produto]="produto"
              modo="admin"
              (editar)="editarProduto($event)"
              (remover)="removerProduto($event)"
            ></app-produto-card>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
    .admin-form {
      background: #f4f4f4;
      padding: 15px;
      border-radius: 8px;
      margin: 0 0 20px;
    }
    .admin-form h2 { margin-top: 0; }
    .admin-form form { display: flex; flex-direction: column; gap: 12px; }
    .admin-form label { display: block; margin-bottom: 4px; font-weight: bold; }
    .admin-form input,
    .admin-form select,
    .admin-form textarea {
      width: 100%;
      padding: 8px;
      box-sizing: border-box;
    }
    .btn-submit {
      padding: 10px 15px;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }
    .btn-submit:disabled { opacity: 0.6; }
    .btn-cancel {
      padding: 10px 15px;
      background: #7f8c8d;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }

    .cardapio .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
    }
  `,
  ],
})
export class AdminScreenComponent implements OnInit {
  protected readonly produtoService = inject(ProdutoService);

  carregandoCadastro = false;

  // ID do produto em edição (null = modo cadastro)
  editando: string | null = null;

  categoriaFiltro = signal<string>('todas');
  buscaFiltro = signal<string>('');

  novoProduto: Produto = {
    nome: '',
    descricao: '',
    preco: 0,
    categoriaId: '',
  };

  ngOnInit(): void {
    this.produtoService.loadCategorias();
    this.produtoService.loadProdutos();
  }

  produtos(): Produto[] {
    return this.produtoService.produtos();
  }

  produtosFiltrados(): Produto[] {
    const busca = this.buscaFiltro().toLowerCase();
    return this.produtos().filter((p) => {
      const combinaCategoria =
        this.categoriaFiltro() === 'todas' || p.categoriaId === this.categoriaFiltro();
      const combinaBusca =
        busca === '' ||
        p.nome.toLowerCase().includes(busca) ||
        (p.descricao?.toLowerCase().includes(busca) ?? false);
      return combinaCategoria && combinaBusca;
    });
  }

  onFiltroChange(filtro: { categoria: string; busca: string }): void {
    this.categoriaFiltro.set(filtro.categoria);
    this.buscaFiltro.set(filtro.busca);
  }

  salvar(): void {
    if (!this.novoProduto.nome || this.novoProduto.preco <= 0 || !this.novoProduto.categoriaId) {
      alert('Por favor, preencha o nome, uma categoria e um preço válido.');
      return;
    }

    if (this.editando) {
      this.atualizarProduto();
      return;
    }

    this.carregandoCadastro = true;
    this.produtoService.criar(this.novoProduto).subscribe({
      next: () => {
        this.novoProduto = { nome: '', descricao: '', preco: 0, categoriaId: '' };
        this.produtoService.recarregarProdutos();
        this.carregandoCadastro = false;
      },
      error: (err: any) => {
        console.error('Erro ao cadastrar produto:', err);
        this.carregandoCadastro = false;
        alert('Erro ao cadastrar produto. Tente novamente.');
      },
    });
  }

  editarProduto(produto: Produto): void {
    if (!produto.id) return;
    this.editando = produto.id;
    this.novoProduto = {
      nome: produto.nome,
      descricao: produto.descricao || '',
      preco: produto.preco,
      categoriaId: produto.categoriaId,
    };
    // Garante que o topo do formulário fique visível para o usuário
    (document.querySelector('.admin-form') as HTMLElement | null)?.scrollIntoView({ behavior: 'smooth' });
  }

  private atualizarProduto(): void {
    const id = this.editando;
    if (!id) return;

    this.carregandoCadastro = true;
    this.produtoService.atualizar(id, {
      nome: this.novoProduto.nome,
      descricao: this.novoProduto.descricao,
      preco: this.novoProduto.preco,
      categoriaId: this.novoProduto.categoriaId,
    }).subscribe({
      next: () => {
        this.novoProduto = { nome: '', descricao: '', preco: 0, categoriaId: '' };
        this.editando = null;
        this.produtoService.recarregarProdutos();
        this.carregandoCadastro = false;
      },
      error: (err: any) => {
        console.error('Erro ao editar produto:', err);
        this.carregandoCadastro = false;
        alert('Erro ao salvar alterações. Tente novamente.');
      },
    });
  }

  cancelarEdicao(): void {
    this.editando = null;
    this.novoProduto = { nome: '', descricao: '', preco: 0, categoriaId: '' };
  }

  removerProduto(id?: string): void {
    if (!id) return;
    if (!confirm('Deseja realmente remover este produto?')) return;

    this.produtoService.excluir(id).subscribe({
      next: () => this.produtoService.recarregarProdutos(),
      error: (err: any) => {
        console.error('Erro ao remover produto:', err);
        alert('Erro ao remover produto. Tente novamente.');
      },
    });
  }
}
