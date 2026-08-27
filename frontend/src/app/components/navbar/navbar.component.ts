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
        <a routerLink="/admin" routerLinkActive="active" class="nav-btn">
          Login
        </a>
      </nav>
    </header>
  `,
  styles: [`
    .navbar { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; background: #ff4757; color: white; }
    .brand { color: white; text-decoration: none; font-size: 1.3rem; font-weight: bold; }
    .nav-links { display: flex; gap: 10px; }
    .nav-btn { background: rgba(255,255,255,0.2); color: white; border: none; padding: 8px 14px; border-radius: 20px; font-weight: bold; cursor: pointer; text-decoration: none; }
    .nav-btn.active { background: white; color: #ff4757; }
  `]
})
export class NavbarComponent {}
