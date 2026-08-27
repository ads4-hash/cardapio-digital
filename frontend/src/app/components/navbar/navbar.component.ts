import { Component, output } from '@angular/core';

@Component({
  selector: 'app-navbar',
  standalone: true,
  template: `
    <header class="navbar">
      <h1>Cardápio Digital</h1>
      <button class="nav-cart" (click)="abrirCarrinho.emit()">🛒 Carrinho</button>
    </header>
  `,
  styles: [`
    .navbar { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; background: #ff4757; color: white; }
    .navbar h1 { margin: 0; font-size: 1.3rem; }
    .nav-cart { background: rgba(255,255,255,0.2); color: white; border: none; padding: 8px 14px; border-radius: 20px; font-weight: bold; cursor: pointer; }
  `]
})
export class NavbarComponent {
  abrirCarrinho = output<void>();
}
