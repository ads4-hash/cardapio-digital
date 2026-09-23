import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Produto, resolverImagemUrl } from '../../services/produto.service';
import { CartService } from '../../services/cart.service';
import { ConfiguracoesService } from '../../services/configuracoes.service';
import { PersonalizacaoProdutoComponent } from '../personalizacao-produto/personalizacao-produto.component';

@Component({
  selector: 'app-produto-card',
  standalone: true,
  imports: [CommonModule, PersonalizacaoProdutoComponent],
  template: `
    <div class="card">
      @if (produtoImagemUrl()) {
        <img [src]="produtoImagemUrl()" alt="{{ produto().nome }}" class="card-img" />
      } @else {
        <div class="card-img card-placeholder" aria-label="Produto sem imagem">
          <span class="placeholder-icone">?</span>
        </div>
      }
      <div class="card-body">
        <h3>{{ produto().nome }}</h3>
        <p class="desc">{{ produto().descricao || ' ' }}</p>
        <div class="card-footer">
          @if (modo() === 'admin') {
            <span class="price">{{ produto().preco | currency:'BRL' }}</span>
            <div class="admin-actions">
              <button class="btn-edit" (click)="editar.emit(produto())">Editar</button>
              <button class="btn-remove" (click)="remover.emit(produto().id)">Remover</button>
            </div>
          } @else {
            <span class="price">{{ produto().preco | currency:'BRL' }}</span>
            <button
              class="btn-add"
              [class.disabled]="!configuracoes.aceitandoPedidos()"
              [disabled]="!configuracoes.aceitandoPedidos()"
              (click)="adicionar()"
            > 
              @if (!configuracoes.aceitandoPedidos()) {
                Sem pedidos
              } @else {
                {{ temIngredientes() ? 'Adicionar' : 'Adicionar' }}
              }
            </button>
          }
        </div>
      </div>
    </div>

    @if (produtoSelecionado()) {
      <app-personalizacao-produto
        [produto]="produtoSelecionado()!"
        (fecharEvento)="fecharPersonalizacao()"
      ></app-personalizacao-produto>
    }
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .card {
      position: relative;
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
      transition: transform var(--transition-slow), box-shadow var(--transition-slow), border-color var(--transition);
    }
    .card:hover {
      transform: translateY(-6px);
      box-shadow: var(--shadow-lg);
      border-color: color-mix(in srgb, var(--primary) 30%, var(--border));
    }
    .card-img {
      width: 100%;
      aspect-ratio: 4 / 3;
      object-fit: cover;
      display: block;
      transition: transform 400ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .card-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--surface-hover), var(--border));
    }
    .placeholder-icone {
      font-size: 2.8rem;
      font-weight: 800;
      color: var(--text-muted);
      opacity: 0.55;
      user-select: none;
    }
    .card:hover .card-img { transform: scale(1.06); }
    .card-body {
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 8px;
      padding: 16px 16px 18px;
    }
    .card-body h3 {
      margin: 0;
      font-size: 1.05rem;
      line-height: 1.3;
      font-weight: 700;
      letter-spacing: -0.01em;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: calc(2 * 1.3 * 1.05rem);
    }
    .desc {
      margin: 0;
      color: var(--text-muted);
      font-size: 0.85rem;
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: calc(2 * 1.45 * 0.85rem);
    }
    .card-footer {
      margin-top: auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .price { font-weight: 800; font-size: 1.05rem; color: var(--accent-dark); }
    .admin-actions { display: flex; gap: 6px; }
    .btn-add, .btn-edit, .btn-remove {
      border: none;
      border-radius: 10px;
      padding: 9px 16px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform var(--transition), box-shadow var(--transition), filter var(--transition);
    }
    .btn-add { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: #fff; box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 30%, transparent); }
    .btn-add.disabled { background: var(--surface-hover); color: var(--text-muted); box-shadow: none; cursor: not-allowed; }
    .btn-edit { background: var(--info); color: #fff; }
    .btn-remove { background: var(--danger); color: #fff; }
    .btn-add:hover:not(:disabled) { filter: brightness(1.05); box-shadow: 0 6px 16px color-mix(in srgb, var(--primary) 40%, transparent); }
    .btn-edit:hover, .btn-remove:hover { filter: brightness(1.08); }
    .btn-add:active, .btn-edit:active, .btn-remove:active { transform: scale(0.95); }
  `]
})
export class ProdutoCardComponent {
  produto = input.required<Produto>();
  modo = input<'cliente' | 'admin'>('cliente');
  editar = output<Produto>();
  remover = output<string | undefined>();
  cartService = inject(CartService);
  configuracoes = inject(ConfiguracoesService);

  produtoSelecionado = signal<Produto | null>(null);

  produtoImagemUrl(): string | undefined {
    return resolverImagemUrl(this.produto().imagemUrl);
  }

  // Indica se o produto possui ingredientes vinculados (usuário pode
  // remover/adicionar com valor extra vindo do vínculo no cadastro)
  temIngredientes(): boolean {
    const vinculos = this.produto().ingredientes;
    return !!vinculos && vinculos.length > 0;
  }

  adicionar(): void {
    if (!this.configuracoes.aceitandoPedidos()) return;

    // Produtos com ingredientes abrem o modal de personalização
    if (this.produto().ingredientes && this.produto().ingredientes!.length > 0) {
      this.produtoSelecionado.set(this.produto());
      return;
    }
    this.cartService.add(this.produto());
  }

  fecharPersonalizacao(): void {
    this.produtoSelecionado.set(null);
  }
}
