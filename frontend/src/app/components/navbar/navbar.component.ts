import { Component, inject, OnInit, signal, afterNextRender } from '@angular/core';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { ConfiguracoesService } from '../../services/configuracoes.service';
import { resolverImagemUrl } from '../../services/produto.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header
      class="navbar"
      [class.hero]="rotaCliente()"
      [class.padrao]="navPadrao()"
      [style.background-image]="rotaCliente() ? fundoHero() : null"
    >
      <span class="brand" [class.hero]="rotaCliente()">
        @if (mostrarLogo() && logoCardapio(); as logo) {
          <img
            class="brand-logo"
            [class.hero]="rotaCliente()"
            [src]="logo"
            alt="Logo do estabelecimento"
          />
        } @else if (!rotaCliente()) {
          <span class="brand-marca" aria-hidden="true"></span>
        }
        @if (!rotaCliente()) {
          <span class="brand-nome" [class.hero]="rotaCliente()">{{ marca() }}</span>
        }
      </span>
      <nav class="nav-links">
        @if (authService.isAutenticado() && naRotaAdmin()) {
          <button
            class="status-btn"
            [class.online]="configuracoes.aceitandoPedidos()"
            [class.offline]="!configuracoes.aceitandoPedidos()"
            (click)="configuracoes.alternar()"
            [attr.aria-label]="configuracoes.aceitandoPedidos() ? 'Suspender pedidos' : 'Liberar pedidos'"
          >
            <span class="status-dot"></span>
            {{ configuracoes.aceitandoPedidos() ? 'online' : 'offline' }}
          </button>
        }
        <button class="theme-btn" (click)="toggleTheme()" [attr.aria-label]="isDark ? 'Alternar para tema claro' : 'Alternar para tema escuro'">
          {{ isDark ? '☀️' : '🌙' }}
        </button>
        @if (authService.isAutenticado() && naRotaAdmin()) {
          <button class="nav-btn" (click)="sair()">Logout</button>
        } @else if (!authService.isAutenticado() && !naRotaLogin()) {
          <a routerLink="/" class="nav-btn">Login</a>
        }
      </nav>
    </header>
  `,
  styles: [`
    .navbar {
      position: sticky;
      top: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 26px;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      border-bottom: none;
      transition: background 0.3s ease;
    }
    /* Navbar padrão (login e admin): cores padrão do app, sem configuração do cardápio */
    .navbar.padrao {
      background: linear-gradient(135deg, var(--primary-default), var(--primary-default-dark));
      border-bottom: none;
    }
    html[data-theme='dark'] .navbar.padrao {
      border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    }
    /* Cabeçalho hero do cardápio público: capa como fundo, logo + nome centralizados */
    .navbar.hero {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;
      min-height: 180px;
      padding: 12px 24px 14px;
      background-color: var(--surface-hover);
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      background-size: cover;
      background-position: center;
      border-bottom: none;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      border-bottom-left-radius: 26px;
      border-bottom-right-radius: 26px;
      box-shadow:
        0 14px 34px rgba(15, 23, 42, 0.26),
        0 4px 12px rgba(15, 23, 42, 0.14);
    }
    .navbar.hero::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        180deg,
        rgba(15, 23, 42, 0.18),
        rgba(15, 23, 42, 0.42)
      );
      pointer-events: none;
    }
    .navbar.hero > * {
      position: relative;
      z-index: 1;
    }
    /* Sombra na linha de transição entre a barra e o conteúdo */
    .navbar.hero::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      height: 30px;
      background: linear-gradient(
        180deg,
        rgba(15, 23, 42, 0.34),
        rgba(15, 23, 42, 0)
      );
      pointer-events: none;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #fff;
      text-decoration: none;
      font-size: 1.1rem;
      font-weight: 800;
      letter-spacing: -0.01em;
      white-space: nowrap;
      transition: color var(--transition);
    }
    .brand.hero {
      flex-direction: column;
      align-items: center;
      gap: 6px;
      white-space: normal;
      text-align: center;
    }
    .brand-marca {
      content: '';
      width: 11px;
      height: 11px;
      border-radius: 4px;
      background: #fff;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      flex-shrink: 0;
    }
    .brand-marca.hero {
      width: 100px;
      height: 100px;
      border-radius: 24px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    }
    .brand-logo {
      width: 26px;
      height: 26px;
      border-radius: 8px;
      object-fit: cover;
      flex-shrink: 0;
      border: 1px solid rgba(255, 255, 255, 0.4);
    }
    .brand-logo.hero {
      width: 126px;
      height: 126px;
      border-radius: 24px;
      border-color: rgba(255, 255, 255, 0.35);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }
    .brand-nome.hero {
      font-size: 1.3rem;
      font-weight: 800;
      color: #fff;
      text-shadow:
        0 1px 3px rgba(0, 0, 0, 0.65),
        0 5px 20px rgba(0, 0, 0, 0.55);
    }
    .navbar.padrao .brand:hover { color: #fff; opacity: 0.9; }
    .brand:hover { color: var(--primary-light); }
    .brand.hero:hover { color: #fff; }
    .nav-links { display: flex; align-items: center; gap: 10px; }
    .navbar.hero .nav-links {
      position: absolute;
      top: 12px;
      right: 24px;
    }
    .theme-btn {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--card);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: var(--radius-pill);
      font-size: 1.05rem;
      cursor: pointer;
      transition: background var(--transition), border-color var(--transition), color var(--transition), transform var(--transition), box-shadow var(--transition);
    }
    .theme-btn:hover { border-color: var(--primary); color: var(--primary); box-shadow: var(--shadow-sm); }
    .theme-btn:active { transform: scale(0.94); }
    .status-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 9px 14px;
      border: 1px solid var(--border);
      border-radius: var(--radius-pill);
      background: var(--card);
      color: var(--text);
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      transition: background var(--transition), border-color var(--transition), color var(--transition), box-shadow var(--transition), transform var(--transition);
    }
    .status-btn .status-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: currentColor;
    }
    .status-btn.online { color: var(--success); border-color: color-mix(in srgb, var(--success) 45%, var(--border)); }
    .status-btn.online:hover { background: color-mix(in srgb, var(--success) 8%, var(--card)); box-shadow: var(--shadow-sm); }
    .status-btn.offline { color: var(--danger); border-color: color-mix(in srgb, var(--danger) 45%, var(--border)); }
    .status-btn.offline:hover { background: color-mix(in srgb, var(--danger) 8%, var(--card)); box-shadow: var(--shadow-sm); }
    .status-btn:active { transform: scale(0.96); }
    .nav-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 9px 18px;
      background: var(--card);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: var(--radius-pill);
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: background var(--transition), border-color var(--transition), color var(--transition), box-shadow var(--transition), transform var(--transition);
    }
    .nav-btn:hover { color: var(--primary); border-color: var(--primary); box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 18%, transparent); }
    .nav-btn:active { transform: scale(0.98); }
    .nav-btn.active {
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: #fff;
      border-color: transparent;
      box-shadow: 0 6px 16px color-mix(in srgb, var(--primary) 35%, transparent);
    }
    @media (max-width: 560px) {
      .navbar { padding: 12px 16px; }
      .brand { font-size: 1rem; }
      .nav-btn { padding: 8px 14px; }
    }
  `]
})
export class NavbarComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly configuracoes = inject(ConfiguracoesService);
  private readonly router = inject(Router);
  isDark = false;
  private readonly rotaAdmin = signal(false);

  // URL atual após cada navegação. Usar um sinal garante que a navbar seja
  // reavaliada quando o roteador termina de navegar — sem isso, os getters que
  // leem router.url ficavam presos ao valor inicial ("/") e o cabeçalho hero
  // (capa/logo do cardápio) nunca era renderizado.
  private readonly urlAtual = signal('');

  constructor() {
    this.urlAtual.set(this.router.url);
    // Aplica o tema salvo já no construtor (só no navegador) para a página
    // nascer com o tema certo, sem "pulo". O isDark do botão só é sincronizado
    // depois da hidratação (afterNextRender) para não causar mismatch com o SSR.
    if (typeof window !== 'undefined') {
      const salvo = localStorage.getItem('theme');
      document.documentElement.setAttribute('data-theme', salvo === 'dark' ? 'dark' : 'light');
    }
    afterNextRender(() => {
      if (typeof window !== 'undefined') {
        this.isDark = localStorage.getItem('theme') === 'dark';
      }
    });
  }

  ngOnInit(): void {
    this.authService.restaurarSessao();
    // Nome do estabelecimento para clientes não logados (também usado como marca)
    this.configuracoes.carregarNome();

    // Estado online/offline só existe nas telas de admin
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((event) => {
        this.urlAtual.set(event.urlAfterRedirects);
        this.rotaAdmin.set(event.urlAfterRedirects.startsWith('/admin'));
        if (this.rotaAdmin() && this.authService.isAutenticado()) {
          this.configuracoes.carregar();
        }
      });
    if (this.rotaAdmin() && this.authService.isAutenticado()) {
      this.configuracoes.carregar();
    }
  }

  toggleTheme() {
    this.isDark = !this.isDark;
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', this.isDark ? 'dark' : 'light');
      localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
    }
  }

  sair() {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  naRotaLogin(): boolean {
    return this.urlAtual() === '' || this.urlAtual() === '/';
  }

  // O título da marca mostra o nome do estabelecimento; só o login é fixo
  marca(): string {
    if (this.naRotaLogin()) return 'Cardápio Digital';
    const logado = this.authService.usuarioLogado()?.nome;
    if (logado) return logado;
    return this.configuracoes.nome() ?? 'Cardápio Digital';
  }

  // A logo aparece no cardápio (grande) e no admin (padrão), mas não no login
  mostrarLogo(): boolean {
    return this.rotaCliente() || this.naRotaAdmin();
  }

  // /login e /admin usam o navbar padrão: estilo e cores neutras,
  // sem configuração de visual do cardápio
  navPadrao(): boolean {
    return this.naRotaLogin() || this.urlAtual().startsWith('/admin');
  }

  // Logo personalizada do estabelecimento (imagem) quando configurada
  logoCardapio(): string | undefined {
    const logo = this.configuracoes.visualCardapio().logoUrl;
    return resolverImagemUrl(logo ?? undefined);
  }

  // Capa como fundo do cabeçalho hero (só no cardápio público)
  fundoHero(): string | null {
    const capa = resolverImagemUrl(
      this.configuracoes.visualCardapio().capaUrl ?? undefined,
    );
    return capa ? `url('${capa}')` : null;
  }

  // O cabeçalho hero (capa + logo/nome) só aparece no cardápio do cliente
  rotaCliente(): boolean {
    return this.urlAtual().startsWith('/cardapio');
  }

  naRotaAdmin(): boolean {
    return this.rotaAdmin() || this.urlAtual().startsWith('/admin');
  }
}
