import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { ConfiguracoesService } from '../../services/configuracoes.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="navbar">
      <span class="brand">Cardápio Digital</span>
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
      background: var(--nav-bg);
      -webkit-backdrop-filter: blur(16px);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--nav-border);
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--text);
      text-decoration: none;
      font-size: 1.1rem;
      font-weight: 800;
      letter-spacing: -0.01em;
      white-space: nowrap;
      transition: color var(--transition);
    }
    .brand::before {
      content: '';
      width: 11px;
      height: 11px;
      border-radius: 4px;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      box-shadow: 0 2px 6px color-mix(in srgb, var(--primary) 50%, transparent);
    }
    .brand:hover { color: var(--primary); }
    .nav-links { display: flex; align-items: center; gap: 10px; }
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

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      this.isDark = saved === 'dark';
      document.documentElement.setAttribute('data-theme', this.isDark ? 'dark' : 'light');
    }
  }

  ngOnInit(): void {
    // Estado online/offline só existe nas telas de admin
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((event) => {
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
    return this.router.url === '/';
  }

  naRotaAdmin(): boolean {
    return this.rotaAdmin() || this.router.url.startsWith('/admin');
  }
}
