import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="navbar">
      <a class="brand" routerLink="/">Cardápio Digital</a>
      <nav class="nav-links">
        <button class="theme-btn" (click)="toggleTheme()" [attr.aria-label]="isDark ? 'Alternar para tema claro' : 'Alternar para tema escuro'">
          {{ isDark ? '☀️' : '🌙' }}
        </button>
        <a routerLink="/admin" routerLinkActive="active" class="nav-btn">
          Login
        </a>
      </nav>
    </header>
  `,
  styles: [`
    .navbar { position: sticky; top: 0; display: flex; justify-content: flex-end; align-items: center; padding: 12px 24px; background: linear-gradient(135deg, #ff4757, #e13444); box-shadow: 0 2px 12px rgba(225,52,68,0.35); z-index: 50; }
    .brand { position: absolute; left: 50%; transform: translateX(-50%); color: white; text-decoration: none; font-size: 1.25rem; font-weight: 700; letter-spacing: 0.3px; white-space: nowrap; }
    .nav-links { display: flex; gap: 10px; align-items: center; }
    .theme-btn { background: rgba(255,255,255,0.18); color: white; border: 1px solid rgba(255,255,255,0.35); width: 38px; height: 38px; border-radius: 999px; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s, transform 0.1s; }
    .theme-btn:hover { background: rgba(255,255,255,0.3); }
    .theme-btn:active { transform: scale(0.92); }
    .nav-btn { background: rgba(255,255,255,0.18); color: white; border: 1px solid rgba(255,255,255,0.35); padding: 8px 18px; border-radius: 999px; font-weight: 600; cursor: pointer; text-decoration: none; transition: background 0.2s, transform 0.1s; }
    .nav-btn:hover { background: rgba(255,255,255,0.3); }
    .nav-btn:active { transform: scale(0.97); }
    .nav-btn.active { background: white; color: #e13444; border-color: white; }
  `]
})
export class NavbarComponent {
  isDark = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      this.isDark = saved === 'dark';
      document.documentElement.setAttribute('data-theme', this.isDark ? 'dark' : 'light');
    }
  }

  toggleTheme() {
    this.isDark = !this.isDark;
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', this.isDark ? 'dark' : 'light');
      localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
    }
  }
}
