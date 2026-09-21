import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NavbarComponent } from './components/navbar/navbar.component';
import { ConfiguracoesService } from './services/configuracoes.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    NavbarComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly configuracoes = inject(ConfiguracoesService);

  ngOnInit(): void {
    // Estado online/offline do cardápio para o cliente (bloqueio do Adicionar)
    this.configuracoes.carregar();
    // Taxa de entrega para o carrinho (retirada/entrega)
    this.configuracoes.carregarTaxaEntrega();
  }
}