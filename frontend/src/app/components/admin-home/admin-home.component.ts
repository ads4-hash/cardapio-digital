import { Component, EventEmitter, Output } from '@angular/core';

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
            <small>Compartilhar o cardápio com os clientes</small>
          </span>
        </button>

        <button class="botao-grande pedidos" (click)="navegar.emit('pedidos')">
          <span class="icone">📋</span>
          <span class="rotulo">
            <strong>Histórico de Pedidos</strong>
            <small>Acompanhar e gerenciar pedidos</small>
          </span>
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
})
export class AdminHomeComponent {
  @Output() navegar = new EventEmitter<SecaoAdmin>();
}