import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProdutoService, Categoria } from '../../services/produto.service';

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
        <button
          [class.active]="categoriaSelecionada() === 'todas'"
          (click)="selecionarCategoria('todas')"
          class="tab-btn"
        >
          Tudo
        </button>

        @for (cat of categorias(); track cat.id) {
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
    .filter-container { display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px; }
    .search-input { padding: 12px 16px; border-radius: 12px; border: 1px solid var(--border, #e5e7eb); background: var(--card, #fff); font-size: 0.95rem; box-shadow: var(--shadow-sm); outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
    .search-input:focus { border-color: var(--primary, #ff4757); box-shadow: 0 0 0 3px rgba(255,71,87,0.15); }
    .search-input::placeholder { color: var(--text-muted, #9ca3af); }
    .tabs { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
    .tab-btn { padding: 9px 16px; border: none; border-radius: 999px; background: var(--card, #fff); color: var(--text, #1f2937); box-shadow: var(--shadow-sm); cursor: pointer; white-space: nowrap; font-weight: 500; transition: background 0.15s, color 0.15s, transform 0.1s; }
    .tab-btn:hover { background: #e8eaed; }
    .tab-btn.active { background: var(--primary, #ff4757); color: white; font-weight: 600; box-shadow: 0 4px 10px rgba(255,71,87,0.35); }
  `]
})
export class CategoriasTabsComponent {
  produtoService = inject(ProdutoService);

  // quando true, mostra apenas categorias visíveis (uso no cliente)
  apenasVisiveis = input(false);

  categoriaSelecionada = signal<string>('todas');
  termoBusca = signal<string>('');

  // Retorna as categorias conforme o modo (visíveis p/ cliente ou todas p/ admin)
  categorias(): Categoria[] {
    if (this.apenasVisiveis()) {
      return this.produtoService.categoriasVisiveisParaCliente();
    }
    return this.produtoService.categorias();
  }

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