import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminPersonalizacaoComponent } from '../admin-personalizacao/admin-personalizacao.component';

// Cardápio público: mostra o link para compartilhar e permite copiar/abrir,
// além da personalização visual (cor, logo e tema) aplicada a esse cardápio
@Component({
  selector: 'app-admin-cardapio',
  standalone: true,
  imports: [CommonModule, AdminPersonalizacaoComponent],
  template: `
    <section class="admin-form cardapio-share">
      <h2 class="titulo-secao">Cardápio público</h2>
      <p class="cardapio-desc">
        Compartilhe o link abaixo com seus clientes para que eles acessem o
        cardápio e façam seus pedidos. Os itens são gerenciados em Produtos.
      </p>
      <div class="cardapio-link">
        <code class="cardapio-url">{{ link() }}</code>
        <button type="button" class="btn-submit" (click)="copiar()">Copiar link</button>
      </div>
      <a class="btn-voltar btn-abrir" [attr.href]="link()" target="_blank" rel="noopener">
        Abrir em nova aba ↗
      </a>
    </section>

    <app-admin-personalizacao></app-admin-personalizacao>
  `,
})
export class AdminCardapioComponent {
  link(): string {
    return typeof window !== 'undefined'
      ? `${window.location.origin}/cardapio`
      : '/cardapio';
  }

  copiar(): void {
    const url = this.link();
    const aoCopiar = (ok: boolean) => {
      if (ok) {
        alert('Link do cardápio copiado!');
      } else {
        window.prompt('Copie o link do cardápio:', url);
      }
    };

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => aoCopiar(true))
        .catch(() => aoCopiar(false));
    } else {
      aoCopiar(false);
    }
  }
}