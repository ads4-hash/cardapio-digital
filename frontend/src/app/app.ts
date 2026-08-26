import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ProdutoService, Produto } from './services/produto.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly produtoService = inject(ProdutoService);
  produtos: Produto[] = [];

  ngOnInit(): void {
    this.produtoService.listar().subscribe({
      next: (dados) => {
        this.produtos = dados;
        console.log('Produtos recebidos do backend:', dados);
      },
      error: (err) => console.error('Erro ao conectar com o NestJS:', err)
    });
  }
}