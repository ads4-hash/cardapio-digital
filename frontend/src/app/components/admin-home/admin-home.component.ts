import { Component, EventEmitter, Input, Output } from '@angular/core';

export type SecaoAdmin =
  | 'inicio'
  | 'cadastro'
  | 'produtos'
  | 'pedidos'
  | 'ingredientes'
  | 'categorias'
  | 'cardapio'
  | 'faturamento'
  | 'perfil';

// Tela inicial do painel: atalhos grandes para cada seção
@Component({
  selector: 'app-admin-home',
  standalone: true,
  template: `
    <div class="admin-home">
      <div class="botoes-grandes">
        <button class="botao-grande adicionar" (click)="navegar.emit('cadastro')">
          <span class="icone">＋</span>
          <span class="rotulo">
            <strong>Adicionar Produto</strong>
            <small>Cadastrar um novo item no cardápio</small>
          </span>
        </button>

        <button class="botao-grande ingredientes" (click)="navegar.emit('ingredientes')">
          <span class="icone">🧀</span>
          <span class="rotulo">
            <strong>Adicionar Ingrediente</strong>
            <small>Cadastrar ou remover ingredientes</small>
          </span>
        </button>

        <button class="botao-grande categorias" (click)="navegar.emit('categorias')">
          <span class="icone">🏷️</span>
          <span class="rotulo">
            <strong>Categorias</strong>
            <small>Adicionar e controlar a visibilidade</small>
          </span>
        </button>

        <button class="botao-grande produtos" (click)="navegar.emit('produtos')">
          <span class="icone">🍔</span>
          <span class="rotulo">
            <strong>Produtos</strong>
            <small>Visualizar, editar ou remover itens</small>
          </span>
        </button>

        <button class="botao-grande cardapio" (click)="navegar.emit('cardapio')">
          <span class="icone">🍽️</span>
          <span class="rotulo">
            <strong>Cardápio</strong>
            <small>Compartilhar e personalizar a aparência do cardápio</small>
          </span>
        </button>

        <button class="botao-grande pedidos" (click)="navegar.emit('pedidos')">
          <span class="icone">📋</span>
          <span class="rotulo">
            <strong>Histórico de Pedidos</strong>
            <small>Acompanhar e gerenciar pedidos</small>
          </span>
          @if (novosPedidos > 0) {
            <span class="badge-novos" aria-label="{{ novosPedidos }} pedido(s) novo(s)">{{ novosPedidos }}</span>
          }
        </button>

        <button class="botao-grande faturamento" (click)="navegar.emit('faturamento')">
          <span class="icone">💰</span>
          <span class="rotulo">
            <strong>Faturamento</strong>
            <small>Resumo e soma dos pedidos concluídos</small>
          </span>
        </button>

        <button class="botao-grande perfil" (click)="navegar.emit('perfil')">
          <span class="icone">👤</span>
          <span class="rotulo">
            <strong>Perfil</strong>
            <small>Editar os dados da conta</small>
          </span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .botao-grande { position: relative; }
    .badge-novos {
      position: absolute;
      top: 14px;
      right: 16px;
      min-width: 22px;
      height: 22px;
      padding: 0 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--danger);
      color: #fff;
      border-radius: var(--radius-pill);
      font-size: 0.78rem;
      font-weight: 800;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      animation: badge-pop var(--transition-slow);
    }
    @keyframes badge-pop {
      from { transform: scale(0.5); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `],
})
export class AdminHomeComponent {
  @Input() novosPedidos = 0;
  @Output() navegar = new EventEmitter<SecaoAdmin>();
}