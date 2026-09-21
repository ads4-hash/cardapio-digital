import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProdutoService, Categoria } from '../../services/produto.service';

// Gestor de categorias: adicionar, alternar visibilidade e remover
@Component({
  selector: 'app-admin-categorias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="admin-form">
      <h2>Gerenciar Categorias</h2>
      <div class="gestor-novo">
        <input
          type="text"
          [ngModel]="novaNome()"
          (ngModelChange)="novaNome.set($event)"
          placeholder="Nova categoria (ex: Porções)"
          (keyup.enter)="criar()"
        />
        <button (click)="criar()">Adicionar</button>
      </div>
      @if (categorias().length === 0) {
        <p class="img-status">Nenhuma categoria cadastrada.</p>
      } @else {
        <div class="categoria-lista">
          @for (cat of categorias(); track cat.id) {
            <div class="categoria-linha">
              <span class="categoria-nome">{{ cat.nome }}</span>
              <div class="categoria-acoes">
                <label class="visivel-toggle">
                  <input
                    type="checkbox"
                    [checked]="cat.visivel !== false"
                    (change)="alternarVisibilidade(cat.id, $event)"
                  />
                  Visível
                </label>
                <button class="chip-remove" (click)="remover(cat.id)">✕</button>
              </div>
            </div>
          }
        </div>
      }
    </section>
  `,
})
export class AdminCategoriasComponent {
  private readonly produtoService = inject(ProdutoService);

  novaNome = signal<string>('');

  // Todas as categorias, inclusive as ocultas
  categorias(): Categoria[] {
    return this.produtoService.categorias();
  }

  criar(): void {
    const nome = this.novaNome().trim();
    if (!nome) return;
    this.produtoService.criarCategoria({ nome }).subscribe({
      next: () => {
        this.novaNome.set('');
        this.produtoService.recarregarCategorias();
      },
      error: (err) => {
        console.error('Erro ao criar categoria:', err);
        alert('Erro ao criar categoria. Tente novamente.');
      },
    });
  }

  alternarVisibilidade(id: string, event: Event): void {
    const visivel = (event.target as HTMLInputElement).checked;
    this.produtoService.atualizarCategoria(id, { visivel }).subscribe({
      next: () => this.produtoService.recarregarCategorias(),
      error: (err) => {
        console.error('Erro ao alterar visibilidade da categoria:', err);
        alert('Erro ao alterar visibilidade. Tente novamente.');
      },
    });
  }

  remover(id: string): void {
    if (!confirm('Deseja remover esta categoria? Os produtos dela também serão removidos.')) return;
    this.produtoService.excluirCategoria(id).subscribe({
      next: () => {
        this.produtoService.recarregarCategorias();
        this.produtoService.recarregarProdutos();
      },
      error: (err) => {
        console.error('Erro ao remover categoria:', err);
        alert('Erro ao remover categoria. Verifique se ela não está em uso.');
      },
    });
  }
}