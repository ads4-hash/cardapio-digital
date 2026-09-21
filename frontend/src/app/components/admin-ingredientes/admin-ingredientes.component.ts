import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProdutoService } from '../../services/produto.service';

// Gestor de ingredientes: listar, adicionar e remover
@Component({
  selector: 'app-admin-ingredientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="admin-form">
      <h2>Gerenciar Ingredientes</h2>
      <div class="gestor-novo">
        <input
          type="text"
          [ngModel]="novoNome()"
          (ngModelChange)="novoNome.set($event)"
          placeholder="Novo ingrediente (ex: Bacon)"
          (keyup.enter)="criar()"
        />
        <button (click)="criar()">Adicionar</button>
      </div>
      @if (ingredientes().length === 0) {
        <p class="img-status">Nenhum ingrediente cadastrado.</p>
      } @else {
        <div class="ing-chips">
          @for (ing of ingredientes(); track ing.id) {
            <span class="chip">
              {{ ing.nome }}
              <button class="chip-remove" (click)="remover(ing.id)">✕</button>
            </span>
          }
        </div>
      }
    </section>
  `,
})
export class AdminIngredientesComponent implements OnInit {
  private readonly produtoService = inject(ProdutoService);

  ingredientes = signal<{ id: string; nome: string }[]>([]);
  novoNome = signal<string>('');

  ngOnInit(): void {
    this.carregar();
  }

  private carregar(): void {
    this.produtoService.listarIngredientes().subscribe({
      next: (dados) => this.ingredientes.set(dados),
      error: (err) => console.error('Erro ao carregar ingredientes:', err),
    });
  }

  criar(): void {
    const nome = this.novoNome().trim();
    if (!nome) return;
    this.produtoService.criarIngrediente({ nome }).subscribe({
      next: () => {
        this.novoNome.set('');
        this.carregar();
      },
      error: (err) => {
        console.error('Erro ao criar ingrediente:', err);
        alert('Erro ao criar ingrediente. Tente novamente.');
      },
    });
  }

  remover(id: string): void {
    if (!confirm('Deseja remover este ingrediente?')) return;
    this.produtoService.excluirIngrediente(id).subscribe({
      next: () => this.carregar(),
      error: (err) => {
        console.error('Erro ao remover ingrediente:', err);
        alert('Erro ao remover ingrediente. Verifique se ele não está em uso.');
      },
    });
  }
}