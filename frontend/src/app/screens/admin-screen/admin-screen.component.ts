import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ProdutoService,
  Produto,
  Ingrediente,
  filtrarProdutos,
  resolverImagemUrl,
} from '../../services/produto.service';
import { CategoriasTabsComponent } from '../../components/categorias-tabs/categorias-tabs.component';
import { ProdutoCardComponent } from '../../components/produto-card/produto-card.component';
import { AdminPedidosComponent } from '../../components/admin-pedidos/admin-pedidos.component';

type Secao = 'inicio' | 'cadastro' | 'produtos' | 'pedidos' | 'ingredientes';

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
          <h2 class="titulo">Painel do Administrador</h2>
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

            <button class="botao-grande produtos" (click)="navegar('produtos')">
              <span class="icone">🍔</span>
              <span class="rotulo">
                <strong>Produtos</strong>
                <small>Visualizar, editar ou remover itens</small>
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

      @if (secao() === 'pedidos') {
        <button class="btn-voltar" (click)="voltar()">← Voltar</button>
        <app-admin-pedidos></app-admin-pedidos>
      }
    </section>
  `,
  styles: [
    `
    .botao-grande { width: 100%; }
    .admin-home .titulo { text-align: center; margin: 0 0 24px; }
    .botoes-grandes { display: flex; flex-direction: column; gap: 18px; max-width: 520px; margin: 0 auto; }
    .botao-grande {
      display: flex;
      align-items: center;
      gap: 18px;
      border: none;
      border-radius: 14px;
      padding: 22px 24px;
      cursor: pointer;
      text-align: left;
      color: white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .botao-grande:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.2); }
    .botao-grande.adicionar { background: #28a745; }
    .botao-grande.produtos { background: #3498db; }
    .botao-grande.pedidos { background: #e67e22; }
    .botao-grande.ingredientes { background: #8e44ad; }
    .botao-grande .icone { font-size: 2.2rem; flex-shrink: 0; }
    .botao-grande .rotulo { display: flex; flex-direction: column; gap: 4px; }
    .botao-grande .rotulo strong { font-size: 1.4rem; }
    .botao-grande .rotulo small { font-size: 0.95rem; opacity: 0.9; }

    .btn-voltar {
      padding: 8px 16px;
      margin-bottom: 16px;
      border: none;
      border-radius: 8px;
      background: #7f8c8d;
      color: white;
      cursor: pointer;
      font-weight: bold;
    }
    .btn-voltar:hover { background: #6c7a7a; }

    .titulo-secao { margin: 0 0 16px; }

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
    .img-status { font-size: 0.85rem; color: #555; }
    .img-preview { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
    .img-preview img { width: 90px; height: 90px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd; }
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

    .ingredientes-form { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
    .ingredientes-form label { display: block; margin-bottom: 4px; font-weight: bold; }
    .ingredientes-ajuda { font-size: 0.8rem; color: #666; margin: 0 0 8px; }
    .ing-busca {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 10px;
      border: 1px solid #ccc;
      border-radius: 6px;
      margin-bottom: 10px;
    }
    .chip-select {
      border: 1px solid #ccc;
      background: #fff;
      border-radius: 20px;
      padding: 6px 14px;
      font-size: 0.85rem;
      cursor: pointer;
      color: #333;
      transition: background 0.15s ease, color 0.15s ease, border 0.15s ease;
    }
    .chip-select:hover { border-color: #8e44ad; }
    .chip-select.selecionado {
      background: #8e44ad;
      color: white;
      border-color: #8e44ad;
    }
    .ing-adicionais {
      margin-top: 14px;
      border-top: 1px solid #eee;
      padding-top: 10px;
    }
    .ing-adicionais-titulo { margin: 0 0 8px; font-size: 0.85rem; color: #555; font-weight: bold; }
    .ing-adicional-linha {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 6px 0;
    }
    .ing-adicional-nome { font-size: 0.9rem; }
    .ing-adicional-preco { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #555; font-weight: normal; }
    .ing-preco { width: 90px; padding: 6px; border: 1px solid #ccc; border-radius: 4px; }

    .gestor-novo { display: flex; gap: 8px; margin-bottom: 14px; }
    .gestor-novo input { flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box; }
    .gestor-novo button { padding: 8px 14px; background: #8e44ad; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; }
    .gestor-novo button:hover { background: #732d91; }
    .ing-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip { display: inline-flex; align-items: center; gap: 6px; background: white; border: 1px solid #ddd; border-radius: 20px; padding: 4px 10px; font-size: 0.85rem; }
    .chip-remove { border: none; background: transparent; color: #e74c3c; cursor: pointer; font-weight: bold; }
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
