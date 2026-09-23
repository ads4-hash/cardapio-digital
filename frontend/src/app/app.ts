import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { effect } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

import { NavbarComponent } from './components/navbar/navbar.component';
import {
  ConfiguracoesService,
  aplicarCorPrimaria,
} from './services/configuracoes.service';

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
export class App {
  private readonly configuracoes = inject(ConfiguracoesService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  // A identidade visual do cardápio só vale na tela pública /cardapio
  private readonly rotaCardapio = signal(false);
  // Navbar fica oculta no acompanhamento do pedido (/pedido)
  mostrarNavbar = signal(true);

  constructor() {
    // Estado online/offline do cardápio para o cliente (bloqueio do Adicionar)
    this.configuracoes.carregar();
    // Taxa de entrega para o carrinho (retirada/entrega)
    this.configuracoes.carregarTaxaEntrega();
    // Identidade visual do cardápio (cor, logo, tema)
    this.configuracoes.carregarVisualCardapio();

    this.rotaCardapio.set(this.router.url.startsWith('/cardapio'));
    this.mostrarNavbar.set(!this.router.url.startsWith('/pedido'));
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((event) => {
        this.rotaCardapio.set(event.urlAfterRedirects.startsWith('/cardapio'));
        this.mostrarNavbar.set(!event.urlAfterRedirects.startsWith('/pedido'));
      });

    // Aplica a cor principal somente na tela pública do cardápio;
    // as demais telas usam as cores padrão do app
    if (!isPlatformServer(this.platformId)) {
      effect(() => {
        const cor = this.rotaCardapio()
          ? this.configuracoes.visualCardapio().cor
          : null;
        aplicarCorPrimaria(cor);
      });
    }
  }
}