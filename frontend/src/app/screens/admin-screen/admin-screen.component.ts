import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ProdutoService,
  Produto,
  filtrarProdutos,
  resolverImagemUrl,
} from '../../services/produto.service';
import { CategoriasTabsComponent } from '../../components/categorias-tabs/categorias-tabs.component';
import { ProdutoCardComponent } from '../../components/produto-card/produto-card.component';
import { AdminPedidosComponent } from '../../components/admin-pedidos/admin-pedidos.component';

type Secao = 'inicio' | 'cadastro' | 'produtos' | 'pedidos';

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

            <button type="submit" class="btn-submit" [disabled]="carregandoCadastro || enviandoImagem()">
              {{ editando ? (carregandoCadastro ? 'Salvando...' : 'Salvar Alterações') : (carregandoCadastro ? 'Cadastrando...' : 'Cadastrar Produto') }}
            </button>
            @if (editando) {
              <button type="button" class="btn-cancel" (click)="cancelarEdicao()">Cancelar</button>
            }
          </form>
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

  ngOnInit(): void {
    this.produtoService.loadCategorias();
    this.produtoService.loadProdutos();
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
    this.produtoService.criar(this.novoProduto).subscribe({
      next: () => {
        this.novoProduto = { nome: '', descricao: '', preco: 0, categoriaId: '' };
        this.limparPrecoFormatado();
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
    }).subscribe({
      next: () => {
        this.novoProduto = { nome: '', descricao: '', preco: 0, categoriaId: '' };
        this.editando = null;
        this.limparPrecoFormatado();
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
