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
import { EstabelecimentoContextoService } from './services/estabelecimento-contexto.service';

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
  private readonly contexto = inject(EstabelecimentoContextoService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  // A identidade visual do cardápio só vale na tela pública /cardapio
  private readonly rotaCardapio = signal(false);
  // Navbar fica oculta no acompanhamento do pedido (/pedido)
  mostrarNavbar = signal(true);

  constructor() {
    this.rotaCardapio.set(this.router.url.startsWith('/cardapio'));
    this.mostrarNavbar.set(!this.router.url.startsWith('/pedido'));
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((event) => {
        const url = event.urlAfterRedirects;
        this.rotaCardapio.set(url.startsWith('/cardapio'));
        this.mostrarNavbar.set(!url.startsWith('/pedido'));
        this.atualizarContexto(url);
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

  // Define o estabelecimento público quando a URL é /cardapio/:slug (e limpa ao
  // sair das telas públicas). No /pedido o slug vem do pedido rastreado.
  private atualizarContexto(url: string): void {
    const match = /^\/cardapio\/([^/]+)\/?/.exec(url);
    if (match) {
      const slug = decodeURIComponent(match[1]);
      this.contexto.definirSlugPublico(slug);
      // Estado online/offline, taxa de entrega, identidade visual e nome/telefone
      // do cardápio visitado (cliente)
      this.configuracoes.carregar(slug);
      this.configuracoes.carregarTaxaEntrega(slug);
      this.configuracoes.carregarVisualCardapio(slug);
      this.configuracoes.carregarNome(slug);
      return;
    }
    if (!url.startsWith('/pedido')) {
      this.contexto.limparSlugPublico();
    }
  }
}