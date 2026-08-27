import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ProdutoService, Produto } from './services/produto.service';
import { CategoriasTabsComponent } from './components/categorias-tabs/categorias-tabs.component';
import { ProdutoCardComponent } from './components/produto-card/produto-card.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { CarrinhoDrawerComponent } from './components/carrinho-drawer/carrinho-drawer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    FormsModule,
    CategoriasTabsComponent,
    ProdutoCardComponent,
    NavbarComponent,
    CarrinhoDrawerComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly produtoService = inject(ProdutoService);

  produtos = signal<Produto[]>([]);
  categorias = this.produtoService.categorias;
  carregandoLista = false;
  carregandoCadastro = false;

  // Filtros ativos
  categoriaFiltro = signal<string>('todas');
  buscaFiltro = signal<string>('');

  // Objeto para vincular aos campos do formulário
  novoProduto: Produto = {
    nome: '',
    descricao: '',
    preco: 0,
    categoriaId: '',
  };

  ngOnInit(): void {
    this.produtoService.loadCategorias();
    this.carregarProdutos();
  }

  carregarProdutos(): void {
    this.carregandoLista = true;
    this.produtoService.listar().subscribe({
      next: (dados: Produto[]) => {
        this.produtos.set(dados);
        this.carregandoLista = false;
      },
      error: (err: any) => {
        console.error('Erro ao conectar com o NestJS:', err);
        this.carregandoLista = false;
      }
    });
  }

  // Produtos exibidos, respeitando os filtros de categoria e busca
  produtosFiltrados(): Produto[] {
    const busca = this.buscaFiltro().toLowerCase();
    return this.produtos().filter((p) => {
      const combinaCategoria =
        this.categoriaFiltro() === 'todas' || p.categoriaId === this.categoriaFiltro();
      const combinaBusca =
        busca === '' ||
        p.nome.toLowerCase().includes(busca) ||
        (p.descricao?.toLowerCase().includes(busca) ?? false);
      return combinaCategoria && combinaBusca;
    });
  }

  onFiltroChange(filtro: { categoria: string; busca: string }): void {
    this.categoriaFiltro.set(filtro.categoria);
    this.buscaFiltro.set(filtro.busca);
  }

  // Método chamado ao submeter o formulário
  cadastrarProduto(): void {
    if (!this.novoProduto.nome || this.novoProduto.preco <= 0 || !this.novoProduto.categoriaId) {
      alert('Por favor, preencha o nome, uma categoria e um preço válido.');
      return;
    }

    this.carregandoCadastro = true;
    this.produtoService.criar(this.novoProduto).subscribe({
      next: (produtoCriado: Produto) => {
        console.log('Produto cadastrado com sucesso:', produtoCriado);

        // Limpa o formulário após cadastrar
        this.novoProduto = { nome: '', descricao: '', preco: 0, categoriaId: '' };

        // Recarrega a lista para mostrar o novo produto imediatamente
        this.carregarProdutos();
        this.carregandoCadastro = false;
      },
      error: (err: any) => {
        console.error('Erro ao cadastrar produto:', err);
        this.carregandoCadastro = false;
        alert('Erro ao cadastrar produto. Tente novamente.');
      }
    });
  }
}
