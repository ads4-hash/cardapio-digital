import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environment';

export interface AceitandoPedidos {
  aceitandoPedidos: boolean;
}

export interface TaxaEntrega {
  taxaEntrega: number;
}

// Estado global do estabelecimento: controla se o cardápio aceita pedidos e o
// valor cobrado em cada entrega. Compartilhado já que admin (on/offline e taxa
// no Faturamento) e cliente (bloqueio do "Adicionar", carrinho) consultam a API.
@Injectable({
  providedIn: 'root',
})
export class ConfiguracoesService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly URL = `${environment.apiUrl}/configuracoes/aceitando-pedidos`;
  private readonly URL_TAXA = `${environment.apiUrl}/configuracoes/taxa-entrega`;

  // Mantém aceitando por padrão até carregar a configuração do servidor
  aceitandoPedidos = signal(true);
  carregado = signal(false);
  // Taxa de entrega definida pelo admin (padrão 0, ou seja, grátis)
  taxaEntrega = signal(0);

  // Consulta o estado atual (GET público)
  carregar(): void {
    if (isPlatformServer(this.platformId)) return;
    this.http.get<AceitandoPedidos>(this.URL).subscribe({
      next: (res) => {
        this.aceitandoPedidos.set(res.aceitandoPedidos);
        this.carregado.set(true);
      },
      error: (err) => {
        console.error('Erro ao consultar estado do cardápio:', err);
        this.carregado.set(true);
      },
    });
  }

  // Consulta a taxa de entrega atual (GET público, usada no carrinho)
  carregarTaxaEntrega(): void {
    if (isPlatformServer(this.platformId)) return;
    this.http.get<TaxaEntrega>(this.URL_TAXA).subscribe({
      next: (res) => this.taxaEntrega.set(res.taxaEntrega),
      error: (err) => console.error('Erro ao consultar taxa de entrega:', err),
    });
  }

  // Define a taxa de entrega (PATCH autenticado — tela de Faturamento)
  definirTaxaEntrega(valor: number): void {
    if (isPlatformServer(this.platformId)) return;
    this.taxaEntrega.set(valor);
    this.http
      .patch<TaxaEntrega>(this.URL_TAXA, { taxaEntrega: valor })
      .subscribe({
        error: (err) => {
          console.error('Erro ao salvar taxa de entrega:', err);
          this.carregarTaxaEntrega();
        },
      });
  }

  // Alterna online/offline (PATCH autenticado pelo interceptor global)
  alternar(): void {
    if (isPlatformServer(this.platformId)) return;
    const novoEstado = !this.aceitandoPedidos();

    // Aplicação otimista: atualiza a UI antes de confirmar na API
    this.aceitandoPedidos.set(novoEstado);
    this.http
      .patch<AceitandoPedidos>(this.URL, { aceitandoPedidos: novoEstado })
      .subscribe({
        error: (err) => {
          console.error('Erro ao alternar estado do cardápio:', err);
          this.aceitandoPedidos.set(!novoEstado);
        },
      });
  }
}