import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ProdutoService,
  Produto,
  Ingrediente,
  Categoria,
  filtrarProdutos,
  resolverImagemUrl,
} from '../../services/produto.service';
import { CategoriasTabsComponent } from '../../components/categorias-tabs/categorias-tabs.component';
import { ProdutoCardComponent } from '../../components/produto-card/produto-card.component';
import { AdminPedidosComponent } from '../../components/admin-pedidos/admin-pedidos.component';

type Secao = 'inicio' | 'cadastro' | 'produtos' | 'pedidos' | 'ingredientes' | 'categorias' | 'cardapio';

@Component({
  selector: 'app-admin-screen',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CategoriasTabsComponent,
    ProdutoCardComponent,
    AdminPedidosComponent,
  ],
  template: `
    <section class="admin-screen">
      @if (secao() === 'inicio') {
        <div class="admin-home">
          <div class="botoes-grandes">
            <button class="botao-grande adicionar" (click)="navegar('cadastro')">
              <span class="icone">＋</span>
              <span class="rotulo">
                <strong>Adicionar Produto</strong>
                <small>Cadastrar um novo item no cardápio</small>
              </span>
            </button>

            <button class="botao-grande ingredientes" (click)="navegar('ingredientes')">
              <span class="icone">🧀</span>
              <span class="rotulo">
                <strong>Adicionar Ingrediente</strong>
                <small>Cadastrar ou remover ingredientes</small>
              </span>
            </button>

            <button class="botao-grande categorias" (click)="navegar('categorias')">
              <span class="icone">🏷️</span>
              <span class="rotulo">
                <strong>Categorias</strong>
                <small>Adicionar e controlar a visibilidade</small>
              </span>
            </button>

            <button class="botao-grande produtos" (click)="navegar('produtos')">
              <span class="icone">🍔</span>
              <span class="rotulo">
                <strong>Produtos</strong>
                <small>Visualizar, editar ou remover itens</small>
              </span>
            </button>

            <button class="botao-grande cardapio" (click)="navegar('cardapio')">
              <span class="icone">🍽️</span>
              <span class="rotulo">
                <strong>Cardápio</strong>
                <small>Compartilhar o cardápio com os clientes</small>
              </span>
            </button>

            <button class="botao-grande pedidos" (click)="navegar('pedidos')">
              <span class="icone">📋</span>
              <span class="rotulo">
                <strong>Histórico de Pedidos</strong>
                <small>Acompanhar e gerenciar pedidos</small>
              </span>
            </button>
          </div>
        </div>
      }

      @if (secao() === 'cadastro') {
        <button class="btn-voltar" (click)="voltar()">← Voltar</button>
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
                type="text"
                id="preco"
                name="preco"
                inputmode="decimal"
                placeholder="Ex: 25,90"
                [ngModel]="precoFormatado()"
                (ngModelChange)="onPrecoChange($event)"
                required
              />
            </div>

            <div>
              <label for="imagem">Imagem do produto:</label>
              <input
                type="file"
                id="imagem"
                name="imagem"
                accept="image/*"
                (change)="onImagemSelecionada($event)"
                [disabled]="enviandoImagem()"
              />
              @if (enviandoImagem()) {
                <p class="img-status">Enviando imagem...</p>
              }
              @if (novoProduto.imagemUrl) {
                <div class="img-preview">
                  <img [src]="resolverImg(novoProduto.imagemUrl)" alt="Pré-visualização" />
                  <button type="button" class="btn-cancel" (click)="removerImagem()">
                    Remover imagem
                  </button>
                </div>
              }
            </div>

            <div class="ingredientes-form">
              <label>Ingredientes</label>
              <p class="ingredientes-ajuda">
                Clique nos ingredientes para incluir no produto. Defina um preço extra para os que o cliente pode adicionar.
              </p>
              @if (ingredientesDisponiveis().length === 0) {
                <p class="img-status">Nenhum ingrediente cadastrado.</p>
              } @else {
                <input
                  type="text"
                  class="ing-busca"
                  name="buscaIngrediente"
                  [ngModel]="buscaIngrediente()"
                  (ngModelChange)="buscaIngrediente.set($event)"
                  placeholder="Buscar ingrediente..."
                />
                @if (ingredientesFiltrados().length === 0) {
                  <p class="img-status">Nenhum ingrediente encontrado para "{{ buscaIngrediente() }}".</p>
                } @else {
                  <div class="ing-chips">
                    @for (ing of ingredientesFiltrados(); track ing.id) {
                      <button
                        type="button"
                        class="chip-select"
                        [class.selecionado]="ingredienteIncluso(ing.id)"
                        (click)="alternarIngrediente(ing.id)"
                      >
                        {{ ing.nome }}
                      </button>
                    }
                  </div>
                }
                @if (ingredientesDoProduto().length > 0) {
                  <div class="ing-adicionais">
                    <p class="ing-adicionais-titulo">Adicionais do produto</p>
                    @for (ing of ingredientesDoProduto(); track ing.id) {
                      <div class="ing-adicional-linha">
                        <span class="ing-adicional-nome">{{ ing.nome }}</span>
                        <label class="ing-adicional-preco">
                          Extra (R$)
                          <input
                            type="number"
                            class="ing-preco"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            [value]="ingredientePrecoExtra(ing.id)"
                            (change)="definirPrecoIngrediente(ing.id, $event)"
                          />
                        </label>
                      </div>
                    }
                  </div>
                }
              }
            </div>

            <button type="submit" class="btn-submit" [disabled]="carregandoCadastro || enviandoImagem()">
              {{ editando ? (carregandoCadastro ? 'Salvando...' : 'Salvar Alterações') : (carregandoCadastro ? 'Cadastrando...' : 'Cadastrar Produto') }}
            </button>
            @if (editando) {
              <button type="button" class="btn-cancel" (click)="cancelarEdicao()">Cancelar</button>
            }
          </form>
        </section>
      }

      @if (secao() === 'ingredientes') {
        <button class="btn-voltar" (click)="voltar()">← Voltar</button>
        <section class="admin-form">
          <h2>Gerenciar Ingredientes</h2>
          <div class="gestor-novo">
            <input
              type="text"
              [ngModel]="novoIngredienteNome()"
              (ngModelChange)="novoIngredienteNome.set($event)"
              placeholder="Novo ingrediente (ex: Bacon)"
              (keyup.enter)="criarIngrediente()"
            />
            <button (click)="criarIngrediente()">Adicionar</button>
          </div>
          @if (ingredientesDisponiveis().length === 0) {
            <p class="img-status">Nenhum ingrediente cadastrado.</p>
          } @else {
            <div class="ing-chips">
              @for (ing of ingredientesDisponiveis(); track ing.id) {
                <span class="chip">
                  {{ ing.nome }}
                  <button class="chip-remove" (click)="removerIngrediente(ing.id)">✕</button>
                </span>
              }
            </div>
          }
        </section>
      }

      @if (secao() === 'categorias') {
        <button class="btn-voltar" (click)="voltar()">← Voltar</button>
        <section class="admin-form">
          <h2>Gerenciar Categorias</h2>
          <div class="gestor-novo">
            <input
              type="text"
              [ngModel]="novaCategoriaNome()"
              (ngModelChange)="novaCategoriaNome.set($event)"
              placeholder="Nova categoria (ex: Porções)"
              (keyup.enter)="criarCategoria()"
            />
            <button (click)="criarCategoria()">Adicionar</button>
          </div>
          @if (categoriasAdmin().length === 0) {
            <p class="img-status">Nenhuma categoria cadastrada.</p>
          } @else {
            <div class="categoria-lista">
              @for (cat of categoriasAdmin(); track cat.id) {
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
                    <button class="chip-remove" (click)="removerCategoria(cat.id)">✕</button>
                  </div>
                </div>
              }
            </div>
          }
        </section>
      }

      @if (secao() === 'produtos') {
        <button class="btn-voltar" (click)="voltar()">← Voltar</button>
        <section class="secao-produtos">
          <h2 class="titulo-secao">Produtos</h2>
          <app-categorias-tabs (onFiltroChange)="onFiltroChange($event)"></app-categorias-tabs>

          <div class="cardapio">
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
          </div>
        </section>
      }

      @if (secao() === 'cardapio') {
        <button class="btn-voltar" (click)="voltar()">← Voltar</button>
        <section class="admin-form cardapio-share">
          <h2 class="titulo-secao">Cardápio público</h2>
          <p class="cardapio-desc">
            Compartilhe o link abaixo com seus clientes para que eles acessem o
            cardápio e façam seus pedidos. Os itens são gerenciados em Produtos.
          </p>
          <div class="cardapio-link">
            <code class="cardapio-url">{{ linkCardapio() }}</code>
            <button type="button" class="btn-submit" (click)="copiarLink()">Copiar link</button>
          </div>
          <a class="btn-voltar btn-abrir" [attr.href]="linkCardapio()" target="_blank" rel="noopener">
            Abrir em nova aba ↗
          </a>
        </section>
      }

      @if (secao() === 'pedidos') {
        <button class="btn-voltar" (click)="voltar()">← Voltar</button>
        <app-admin-pedidos></app-admin-pedidos>
      }
    </section>
  `,
  styles: [
    `
    .botoes-grandes {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
      max-width: 720px;
      margin: 0 auto;
    }
    @media (min-width: 640px) {
      .botoes-grandes { grid-template-columns: 1fr 1fr; }
    }
    .botao-grande {
      display: flex;
      align-items: center;
      gap: 16px;
      width: 100%;
      border: none;
      border-radius: var(--radius);
      padding: 22px 24px;
      cursor: pointer;
      text-align: left;
      color: #fff;
      box-shadow: var(--shadow-md);
      transition: transform var(--transition-slow), box-shadow var(--transition-slow), filter var(--transition);
    }
    .botao-grande:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); filter: brightness(1.05); }
    .botao-grande:active { transform: translateY(-1px) scale(0.99); }
    .botao-grande.adicionar { background: linear-gradient(135deg, var(--accent), var(--accent-dark)); }
    .botao-grande.produtos { background: linear-gradient(135deg, var(--info), #2563eb); }
    .botao-grande.cardapio { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); }
    .botao-grande.pedidos { background: linear-gradient(135deg, var(--warning), #d97706); }
    .botao-grande.ingredientes { background: linear-gradient(135deg, var(--violet), #6d28d9); }
    .botao-grande.categorias { background: linear-gradient(135deg, var(--teal), #0d9488); }
    .botao-grande .icone {
      width: 52px;
      height: 52px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.16);
      font-size: 1.6rem;
    }
    .botao-grande .rotulo { display: flex; flex-direction: column; gap: 3px; }
    .botao-grande .rotulo strong { font-size: 1.15rem; }
    .botao-grande .rotulo small { font-size: 0.85rem; opacity: 0.9; }

    .btn-voltar {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 16px;
      margin-bottom: 20px;
      border: 1px solid var(--border);
      border-radius: var(--radius-pill);
      background: var(--card);
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
      transition: color var(--transition), border-color var(--transition), background var(--transition), transform var(--transition);
    }
    .btn-voltar:hover { color: var(--primary); border-color: var(--primary); }
    .btn-voltar:active { transform: translateX(-2px); }

    .titulo-secao { margin: 0 0 20px; color: var(--text); font-weight: 800; }

    .cardapio-share h2.titulo-secao { margin-bottom: 8px; }
    .cardapio-desc { margin: 0 0 16px; color: var(--text-muted); font-size: 0.95rem; line-height: 1.55; }
    .cardapio-link {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }
    .cardapio-url {
      flex: 1;
      min-width: 0;
      padding: 12px 14px;
      background: var(--surface-hover);
      border: 1px solid var(--border);
      border-radius: 12px;
      font-size: 0.9rem;
      color: var(--text);
      overflow-x: auto;
      white-space: nowrap;
    }
    .btn-abrir { text-decoration: none; }

    .admin-form {
      background: var(--card);
      padding: 24px;
      border-radius: var(--radius);
      margin: 0 0 24px;
      border: 1px solid var(--border);
      box-shadow: var(--shadow-sm);
    }
    .admin-form h2 { margin: 0 0 20px; font-size: 1.25rem; font-weight: 800; letter-spacing: -0.015em; }
    .admin-form form { display: flex; flex-direction: column; gap: 16px; }
    .admin-form label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 0.88rem; color: var(--text); }
    .admin-form input,
    .admin-form select,
    .admin-form textarea {
      width: 100%;
      padding: 12px 14px;
      box-sizing: border-box;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--card);
      color: var(--text);
      font-size: 0.95rem;
      outline: none;
      transition: border-color var(--transition), box-shadow var(--transition);
    }
    .admin-form input:focus,
    .admin-form select:focus,
    .admin-form textarea:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 4px var(--primary-light);
    }
    .img-status { font-size: 0.85rem; color: var(--text-muted); }
    .img-preview { display: flex; align-items: center; gap: 12px; margin-top: 10px; }
    .img-preview img { width: 88px; height: 88px; object-fit: cover; border-radius: 12px; border: 1px solid var(--border); }
    .btn-submit, .btn-cancel {
      padding: 12px 18px;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      font-weight: 600;
      transition: transform var(--transition), box-shadow var(--transition), filter var(--transition);
    }
    .btn-submit {
      background: linear-gradient(135deg, var(--accent), var(--accent-dark));
      color: #fff;
      box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 30%, transparent);
    }
    .btn-cancel { background: var(--surface-hover); color: var(--text-muted); }
    .btn-submit:hover:not(:disabled) { filter: brightness(1.05); box-shadow: 0 6px 16px color-mix(in srgb, var(--accent) 40%, transparent); }
    .btn-submit:disabled { opacity: 0.55; cursor: not-allowed; }

    .cardapio .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
      gap: 20px;
    }
    @media (max-width: 560px) {
      .cardapio .grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 14px; }
    }

    .ingredientes-form {
      background: var(--surface-hover);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 16px;
    }
    .ingredientes-form label { display: block; margin-bottom: 4px; font-weight: 700; }
    .ingredientes-ajuda { font-size: 0.82rem; color: var(--text-muted); margin: 0 0 12px; line-height: 1.5; }
    .ing-busca {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 14px;
      border: 1px solid var(--border);
      border-radius: 10px;
      margin-bottom: 12px;
      background: var(--card);
      color: var(--text);
      outline: none;
      transition: border-color var(--transition), box-shadow var(--transition);
      font-size: 0.9rem;
    }
    .ing-busca:focus { border-color: var(--violet); box-shadow: 0 0 0 4px color-mix(in srgb, var(--violet) 15%, transparent); }
    .chip-select {
      border: 1px solid var(--border);
      background: var(--card);
      border-radius: var(--radius-pill);
      padding: 7px 14px;
      font-size: 0.85rem;
      cursor: pointer;
      color: var(--text);
      transition: background var(--transition), color var(--transition), border-color var(--transition), transform var(--transition), box-shadow var(--transition);
    }
    .chip-select:hover { border-color: var(--violet); color: var(--violet); transform: translateY(-1px); }
    .chip-select.selecionado {
      background: linear-gradient(135deg, var(--violet), #6d28d9);
      color: #fff;
      border-color: transparent;
      box-shadow: 0 4px 12px color-mix(in srgb, var(--violet) 35%, transparent);
    }
    .ing-adicionais {
      margin-top: 16px;
      border-top: 1px solid var(--border);
      padding-top: 12px;
    }
    .ing-adicionais-titulo { margin: 0 0 8px; font-size: 0.85rem; color: var(--text-muted); font-weight: 700; }
    .ing-adicional-linha {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 0;
    }
    .ing-adicional-nome { font-size: 0.9rem; font-weight: 500; }
    .ing-adicional-preco { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: var(--text-muted); font-weight: normal; }
    .ing-preco {
      width: 90px;
      padding: 8px 10px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--card);
      outline: none;
      transition: border-color var(--transition), box-shadow var(--transition);
    }
    .ing-preco:focus { border-color: var(--violet); box-shadow: 0 0 0 3px color-mix(in srgb, var(--violet) 15%, transparent); }

    .gestor-novo { display: flex; gap: 10px; margin-bottom: 16px; }
    .gestor-novo input {
      flex: 1;
      min-width: 0;
      padding: 12px 14px;
      border: 1px solid var(--border);
      border-radius: 12px;
      box-sizing: border-box;
      background: var(--card);
      color: var(--text);
      outline: none;
      transition: border-color var(--transition), box-shadow var(--transition);
    }
    .gestor-novo input:focus { border-color: var(--violet); box-shadow: 0 0 0 4px color-mix(in srgb, var(--violet) 15%, transparent); }
    .gestor-novo button {
      padding: 12px 20px;
      background: linear-gradient(135deg, var(--violet), #6d28d9);
      color: #fff;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px color-mix(in srgb, var(--violet) 30%, transparent);
      transition: filter var(--transition), transform var(--transition), box-shadow var(--transition);
    }
    .gestor-novo button:hover { filter: brightness(1.08); box-shadow: 0 6px 16px color-mix(in srgb, var(--violet) 40%, transparent); }
    .gestor-novo button:active { transform: scale(0.97); }
    .ing-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-pill);
      padding: 6px 12px;
      font-size: 0.85rem;
      box-shadow: var(--shadow-sm);
    }
    .chip-remove {
      border: none;
      background: transparent;
      color: var(--danger);
      cursor: pointer;
      font-weight: 700;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background var(--transition);
    }

    .categoria-lista { display: flex; flex-direction: column; gap: 10px; }
    .categoria-linha {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: var(--shadow-sm);
      transition: border-color var(--transition), box-shadow var(--transition);
    }
    .categoria-nome { font-size: 0.95rem; font-weight: 600; }
    .categoria-acoes { display: flex; align-items: center; gap: 12px; }
    .visivel-toggle { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: var(--text-muted); cursor: pointer; font-weight: normal; }
    .visivel-toggle input { width: auto; accent-color: var(--teal); }
  `,
  ],
})
export class AdminScreenComponent implements OnInit {
  protected readonly produtoService = inject(ProdutoService);
  protected readonly resolverImg = resolverImagemUrl;

  secao = signal<Secao>('inicio');

  carregandoCadastro = false;
  enviandoImagem = signal(false);

  // ID do produto em edição (null = modo cadastro)
  editando: string | null = null;

  precoFormatado = signal<string>('');

  categoriaFiltro = signal<string>('todas');
  buscaFiltro = signal<string>('');

  novoProduto: Produto = {
    nome: '',
    descricao: '',
    preco: 0,
    categoriaId: '',
  };

  // Lista global de ingredientes cadastrados (para vínculo no produto)
  ingredientesDisponiveis = signal<Ingrediente[]>([]);
  // ingredientes selecionados para o produto (id -> precoAdicional)
  ingredientesSelecionados = signal<Record<string, number>>({});
  novoIngredienteNome = signal<string>('');
  // termo de busca na seção de ingredientes do cadastro de produto
  buscaIngrediente = signal<string>('');
  // nome da nova categoria digitada pelo admin
  novaCategoriaNome = signal<string>('');

  ngOnInit(): void {
    this.produtoService.loadCategorias();
    this.produtoService.loadProdutos();
    this.carregarIngredientes();
  }

  carregarIngredientes(): void {
    this.produtoService.listarIngredientes().subscribe({
      next: (dados) => this.ingredientesDisponiveis.set(dados),
      error: (err) => console.error('Erro ao carregar ingredientes:', err),
    });
  }

  criarIngrediente(): void {
    const nome = this.novoIngredienteNome().trim();
    if (!nome) return;
    this.produtoService.criarIngrediente({ nome }).subscribe({
      next: () => {
        this.novoIngredienteNome.set('');
        this.carregarIngredientes();
      },
      error: (err) => {
        console.error('Erro ao criar ingrediente:', err);
        alert('Erro ao criar ingrediente. Tente novamente.');
      },
    });
  }

  removerIngrediente(id: string): void {
    if (!confirm('Deseja remover este ingrediente?')) return;
    this.produtoService.excluirIngrediente(id).subscribe({
      next: () => this.carregarIngredientes(),
      error: (err) => {
        console.error('Erro ao remover ingrediente:', err);
        alert('Erro ao remover ingrediente. Verifique se ele não está em uso.');
      },
    });
  }

  // Categorias exibidas na tela de gestão (todas, inclusive as ocultas)
  categoriasAdmin(): Categoria[] {
    return this.produtoService.categorias();
  }

  criarCategoria(): void {
    const nome = this.novaCategoriaNome().trim();
    if (!nome) return;
    this.produtoService.criarCategoria({ nome }).subscribe({
      next: () => {
        this.novaCategoriaNome.set('');
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

  removerCategoria(id: string): void {
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

  produtos(): Produto[] {
    return this.produtoService.produtos();
  }

  produtosFiltrados(): Produto[] {
    return filtrarProdutos(
      this.produtos(),
      this.categoriaFiltro(),
      this.buscaFiltro(),
    );
  }

  navegar(secao: Secao): void {
    this.secao.set(secao);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  voltar(): void {
    this.navegar('inicio');
  }

  linkCardapio(): string {
    return typeof window !== 'undefined'
      ? `${window.location.origin}/cardapio`
      : '/cardapio';
  }

  copiarLink(): void {
    const link = this.linkCardapio();
    const aoCopiar = (ok: boolean) => {
      if (ok) {
        alert('Link do cardápio copiado!');
      } else {
        window.prompt('Copie o link do cardápio:', link);
      }
    };

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(link)
        .then(() => aoCopiar(true))
        .catch(() => aoCopiar(false));
    } else {
      aoCopiar(false);
    }
  }

  onFiltroChange(filtro: { categoria: string; busca: string }): void {
    this.categoriaFiltro.set(filtro.categoria);
    this.buscaFiltro.set(filtro.busca);
  }

  onPrecoChange(valor: string): void {
    const digitos = valor.replace(/\D/g, '').slice(0, 10);
    if (!digitos) {
      this.precoFormatado.set('');
      return;
    }
    // Interpreta os dígitos da direita (os últimos 2 são os centavos),
    // sem forçar zeros desnecessários na parte inteira.
    const pad = digitos.padStart(3, '0');
    let reais = pad.slice(0, -2).replace(/^0+(?=\d)/, '');
    const centavos = pad.slice(-2);
    if (reais === '0' && digitos.length <= 2) reais = '';
    const reaisGrupos = reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    this.precoFormatado.set(`${reaisGrupos},${centavos}`);
  }

  precoParaNumero(): number {
    return Number(this.precoFormatado().replace(/\./g, '').replace(',', '.'));
  }

  limparPrecoFormatado(): void {
    this.precoFormatado.set('');
  }

  ingredienteIncluso(id: string): boolean {
    return id in this.ingredientesSelecionados();
  }

  // Ingredientes filtrados pelo termo de busca (na tela de cadastro de produto)
  ingredientesFiltrados(): Ingrediente[] {
    const termo = this.buscaIngrediente().trim().toLowerCase();
    if (!termo) return this.ingredientesDisponiveis();
    return this.ingredientesDisponiveis().filter((ing) =>
      ing.nome.toLowerCase().includes(termo),
    );
  }

  // Ingredientes selecionados (objetos completos) na ordem cadastrada
  ingredientesDoProduto(): Ingrediente[] {
    return this.ingredientesDisponiveis().filter((ing) =>
      this.ingredienteIncluso(ing.id),
    );
  }

  ingredientePrecoExtra(id: string): number {
    return this.ingredientesSelecionados()[id] ?? 0;
  }

  alternarIngrediente(id: string): void {
    const atual = this.ingredientesSelecionados();
    if (id in atual) {
      const { [id]: _removido, ...resto } = atual;
      this.ingredientesSelecionados.set(resto);
    } else {
      this.ingredientesSelecionados.set({ ...atual, [id]: 0 });
    }
  }

  definirPrecoIngrediente(id: string, event: Event): void {
    const valor = Number((event.target as HTMLInputElement).value);
    const atual = this.ingredientesSelecionados();
    this.ingredientesSelecionados.set({
      ...atual,
      [id]: isNaN(valor) ? 0 : valor,
    });
  }

  // Monta a lista de ingredientes para enviar ao backend
  ingredientesParaSalvar(): { ingredienteId: string; precoAdicional: number }[] {
    return Object.entries(this.ingredientesSelecionados()).map(
      ([ingredienteId, precoAdicional]) => ({
        ingredienteId,
        precoAdicional: Number(precoAdicional) || 0,
      }),
    );
  }

  limparIngredientesSelecionados(): void {
    this.ingredientesSelecionados.set({});
  }

  onImagemSelecionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.enviandoImagem.set(true);
    this.produtoService.uploadImagem(file).subscribe({
      next: (res) => {
        this.novoProduto.imagemUrl = res.url;
        this.enviandoImagem.set(false);
        input.value = '';
      },
      error: (err) => {
        console.error('Erro ao enviar imagem:', err);
        this.enviandoImagem.set(false);
        input.value = '';
        alert('Erro ao enviar imagem. Verifique o formato/limite (5 MB) e tente novamente.');
      },
    });
  }

  removerImagem(): void {
    this.novoProduto.imagemUrl = undefined;
  }

  salvar(): void {
    this.novoProduto.preco = this.precoParaNumero();
    if (!this.novoProduto.nome || this.novoProduto.preco <= 0 || !this.novoProduto.categoriaId) {
      alert('Por favor, preencha o nome, uma categoria e um preço válido.');
      return;
    }

    if (this.editando) {
      this.atualizarProduto();
      return;
    }

    this.carregandoCadastro = true;
    this.produtoService
      .criar({ ...this.novoProduto, ingredientes: this.ingredientesParaSalvar() })
      .subscribe({
        next: () => {
          this.novoProduto = { nome: '', descricao: '', preco: 0, categoriaId: '' };
          this.limparPrecoFormatado();
          this.limparIngredientesSelecionados();
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
      imagemUrl: produto.imagemUrl,
    };
    this.precoFormatado.set(
      produto.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    );

    // Preenche a seleção de ingredientes a partir do produto
    const selecao: Record<string, number> = {};
    for (const vinculo of produto.ingredientes ?? []) {
      selecao[vinculo.ingredienteId] = vinculo.precoAdicional ?? 0;
    }
    this.ingredientesSelecionados.set(selecao);

    this.navegar('cadastro');
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
      imagemUrl: this.novoProduto.imagemUrl,
      ingredientes: this.ingredientesParaSalvar(),
    }).subscribe({
      next: () => {
        this.novoProduto = { nome: '', descricao: '', preco: 0, categoriaId: '' };
        this.editando = null;
        this.limparPrecoFormatado();
        this.limparIngredientesSelecionados();
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
    this.limparPrecoFormatado();
    this.limparIngredientesSelecionados();
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
