import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms'; // <--- Importante adicionar esta linha

import { ProdutoService, Produto } from './services/produto.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule], // <--- Adicionado FormsModule aqui
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly produtoService = inject(ProdutoService);
  
  produtos: Produto[] = [];

  // Objeto para vincular aos campos do formulário
  novoProduto: Produto = {
    nome: '',
    descricao: '',
    preco: 0
  };

  ngOnInit(): void {
    this.carregarProdutos();
  }

  carregarProdutos(): void {
    this.produtoService.listar().subscribe({
      next: (dados: Produto[]) => {
        this.produtos = dados;
      },
      error: (err: any) => console.error('Erro ao conectar com o NestJS:', err)
    });
  }

  // Método chamado ao submeter o formulário
  cadastrarProduto(): void {
    if (!this.novoProduto.nome || this.novoProduto.preco <= 0) {
      alert('Por favor, preencha o nome e um preço válido.');
      return;
    }

    this.produtoService.criar(this.novoProduto).subscribe({
      next: (produtoCriado: Produto) => {
        console.log('Produto cadastrado com sucesso:', produtoCriado);
        
        // Limpa o formulário após cadastrar
        this.novoProduto = { nome: '', descricao:'', preco: 0 };
        
        // Recarrega a lista para mostrar o novo produto imediatamente
        this.carregarProdutos();
      },
      error: (err: any) => console.error('Erro ao cadastrar produto:', err)
    });
  }
}