import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-screen',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="hero">
      <div class="brand-mark" aria-hidden="true"></div>
      <span class="hero-badge">Cardápio Digital</span>
      <h1>
        Seu cardápio, <span class="grad">simples</span> e
        <span class="grad">elegante</span>.
      </h1>
      <p class="lead">
        Apresente seus produtos, receba pedidos dos clientes e gerencie tudo em
        um único lugar.
      </p>
      <div class="hero-actions">
        <a routerLink="/cardapio" class="btn-primary">Ver cardápio</a>
        <a routerLink="/admin" class="btn-outline">Acesso administrativo</a>
      </div>
    </section>

    <section class="features">
      <article class="feature-card">
        <span class="feature-icon" aria-hidden="true">🍽️</span>
        <h3>Cardápio do cliente</h3>
        <p>
          Explore os produtos por categoria, busque pelo nome e escolha os
          ingredientes de que gosta.
        </p>
      </article>
      <article class="feature-card">
        <span class="feature-icon" aria-hidden="true">🛒</span>
        <h3>Pedidos rápidos</h3>
        <p>
          Monte seu carrinho, personalize seu pedido e envie direto para a
          cozinha.
        </p>
      </article>
      <article class="feature-card">
        <span class="feature-icon" aria-hidden="true">🛠️</span>
        <h3>Painel administrativo</h3>
        <p>
          Gerencie produtos, categorias, ingredientes e acompanhe os pedidos
          com acesso protegido.
        </p>
      </article>
    </section>
  `,
  styles: [`
    .hero {
      text-align: center;
      max-width: 640px;
      margin: 0 auto;
      padding: 56px 0 48px;
    }
    .brand-mark {
      width: 64px;
      height: 64px;
      border-radius: 20px;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      box-shadow: 0 10px 24px color-mix(in srgb, var(--primary) 40%, transparent);
      margin: 0 auto 18px;
    }
    .hero-badge {
      display: inline-flex;
      padding: 7px 14px;
      border-radius: var(--radius-pill);
      background: var(--card);
      border: 1px solid var(--border);
      color: var(--primary);
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 18px;
    }
    h1 {
      margin: 0 0 16px;
      font-size: 2.6rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.12;
    }
    @media (max-width: 560px) {
      h1 { font-size: 1.9rem; }
    }
    .grad {
      background: linear-gradient(135deg, var(--primary), var(--accent));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .lead {
      margin: 0 auto 28px;
      max-width: 460px;
      color: var(--text-muted);
      font-size: 1.05rem;
      line-height: 1.6;
    }
    .hero-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .btn-primary,
    .btn-outline {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 13px 26px;
      border-radius: var(--radius-pill);
      font-size: 0.95rem;
      font-weight: 700;
      text-decoration: none;
      transition: filter var(--transition), transform var(--transition), box-shadow var(--transition), border-color var(--transition);
    }
    .btn-primary {
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: #fff;
      border: 1px solid transparent;
      box-shadow: 0 6px 16px color-mix(in srgb, var(--primary) 35%, transparent);
    }
    .btn-primary:hover { filter: brightness(1.05); box-shadow: 0 8px 20px color-mix(in srgb, var(--primary) 45%, transparent); }
    .btn-primary:active { transform: scale(0.98); }
    .btn-outline {
      color: var(--text);
      border: 1px solid var(--border);
      background: var(--card);
    }
    .btn-outline:hover { color: var(--primary); border-color: var(--primary); box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 15%, transparent); }
    .btn-outline:active { transform: scale(0.98); }
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 18px;
      max-width: 900px;
      margin: 0 auto;
    }
    .feature-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 26px 22px;
      box-shadow: var(--shadow-sm);
      transition: transform var(--transition), box-shadow var(--transition), border-color var(--transition);
    }
    .feature-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-lg);
      border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
    }
    .feature-icon {
      display: inline-flex;
      width: 46px;
      height: 46px;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      border-radius: 12px;
      background: var(--surface-muted);
      border: 1px solid var(--border);
      margin-bottom: 14px;
    }
    h3 {
      margin: 0 0 8px;
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .feature-card p {
      margin: 0;
      color: var(--text-muted);
      font-size: 0.9rem;
      line-height: 1.55;
    }
  `],
})
export class HomeScreenComponent {}