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
    .filter-container { display: flex; flex-direction: column; gap: 16px; margin-bottom: 28px; }
    .search-input {
      width: 100%;
      padding: 13px 18px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--card);
      color: var(--text);
      font-size: 0.95rem;
      box-shadow: var(--shadow-sm);
      outline: none;
      transition: border-color var(--transition), box-shadow var(--transition);
    }
    .search-input::placeholder { color: var(--text-muted); opacity: 0.75; }
    .search-input:focus { border-color: var(--primary); box-shadow: 0 0 0 4px var(--primary-light); }
    .tabs { display: flex; gap: 8px; overflow-x: auto; padding: 4px 2px 8px; scrollbar-width: none; }
    .tabs::-webkit-scrollbar { display: none; }
    .tab-btn {
      flex-shrink: 0;
      padding: 9px 18px;
      border: 1px solid transparent;
      border-radius: var(--radius-pill);
      background: var(--card);
      color: var(--text-muted);
      box-shadow: var(--shadow-sm);
      cursor: pointer;
      white-space: nowrap;
      font-weight: 500;
      font-size: 0.9rem;
      transition: background var(--transition), color var(--transition), border-color var(--transition), box-shadow var(--transition), transform var(--transition);
    }
    .tab-btn:hover { color: var(--primary); border-color: color-mix(in srgb, var(--primary) 30%, var(--border)); }
    .tab-btn:active { transform: scale(0.97); }
    .tab-btn.active {
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: #fff;
      font-weight: 700;
      box-shadow: 0 6px 14px color-mix(in srgb, var(--primary) 35%, transparent);
    }
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