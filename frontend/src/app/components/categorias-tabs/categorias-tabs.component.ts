import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProdutoService } from '../../services/produto.service';

@Component({
  selector: 'app-categorias-tabs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="filter-container">
      <input 
        type="text" 
        placeholder="Buscar produto ou ingrediente..." 
        [ngModel]="termoBusca()"
        (ngModelChange)="onBuscaChange($event)"
        class="search-input"
      />

      <div class="tabs">
        @for (cat of produtoService.categorias(); track cat.id) {
          <button 
            [class.active]="categoriaSelecionada() === cat.id"
            (click)="selecionarCategoria(cat.id)"
            class="tab-btn"
          >
            {{ cat.nome }}
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .filter-container { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
    .search-input { padding: 10px 14px; border-radius: 8px; border: 1px solid #ccc; font-size: 1rem; }
    .tabs { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
    .tab-btn { padding: 8px 16px; border: none; border-radius: 20px; background: #e0e0e0; cursor: pointer; white-space: nowrap; }
    .tab-btn.active { background: #ff4757; color: white; font-weight: bold; }
  `]
})
export class CategoriasTabsComponent {
  produtoService = inject(ProdutoService);

  categoriaSelecionada = signal<string>('todas');
  termoBusca = signal<string>('');

  // Notifica o componente pai quando os filtros mudam
  onFiltroChange = output<{ categoria: string; busca: string }>();

  selecionarCategoria(id: string) {
    this.categoriaSelecionada.set(id);
    this.emitirFiltro();
  }

  onBuscaChange(valor: string) {
    this.termoBusca.set(valor);
    this.emitirFiltro();
  }

  private emitirFiltro() {
    this.onFiltroChange.emit({
      categoria: this.categoriaSelecionada(),
      busca: this.termoBusca()
    });
  }
}