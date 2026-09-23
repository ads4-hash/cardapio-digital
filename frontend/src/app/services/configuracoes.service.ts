import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../environment';

export interface AceitandoPedidos {
  aceitandoPedidos: boolean;
}

export interface TaxaEntrega {
  taxaEntrega: number;
}

export interface InfoCardapio {
  nome: string | null;
  telefone: string | null;
}

export interface VisualCardapio {
  cor: string | null;
  logoUrl: string | null;
  capaUrl: string | null;
  tema: 'claro' | 'escuro' | 'auto';
}

const CHAVE_NOME = 'config_nome';
const CHAVE_TELEFONE = 'config_telefone';
const CHAVE_VISUAL = 'config_visual';
const PADRAO_VISUAL: VisualCardapio = {
  cor: null,
  logoUrl: null,
  capaUrl: null,
  tema: 'auto',
};

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
  private readonly URL_NOME = `${environment.apiUrl}/auth/cardapio`;
  private readonly URL_VISUAL = `${environment.apiUrl}/configuracoes/cardapio`;

  // Mantém aceitando por padrão até carregar a configuração do servidor
  aceitandoPedidos = signal(true);
  carregado = signal(false);
  // Taxa de entrega definida pelo admin (padrão 0, ou seja, grátis)
  taxaEntrega = signal(0);
  // Nome do estabelecimento mostrado na barra — público (clientes também veem).
  // Lê o cache já na construção para a barra pintar o nome sem esperar a API.
  nome = signal<string | null>(this.carregarNomeCache());
  // Telefone de contato do estabelecimento — usado no botão de WhatsApp da
  // tela de acompanhamento de pedido (público, vindo do mesmo GET /auth/cardapio)
  telefone = signal<string | null>(this.carregarTelefoneCache());

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

  // Identidade visual do cardápio público — lida do cache na construção para a
  // página já nascer com a cor/logo/tema salvos, sem esperar a API
  visualCardapio = signal<VisualCardapio>(this.carregarVisualCache());

  // Consulta a identidade visual do cardápio (GET público)
  carregarVisualCardapio(): void {
    if (isPlatformServer(this.platformId)) return;
    this.http.get<VisualCardapio>(this.URL_VISUAL).subscribe({
      next: (res) => {
        this.visualCardapio.set(res);
        window.localStorage.setItem(CHAVE_VISUAL, JSON.stringify(res));
      },
      error: (err) =>
        console.error('Erro ao consultar visual do cardápio:', err),
    });
  }

  // Salva a identidade visual (PATCH autenticado — tela de Personalização)
  salvarVisualCardapio(
    dados: Partial<VisualCardapio>,
  ): Observable<VisualCardapio> {
    return this.http.patch<VisualCardapio>(this.URL_VISUAL, dados).pipe(
      tap((res) => {
        this.visualCardapio.set(res);
        window.localStorage.setItem(CHAVE_VISUAL, JSON.stringify(res));
      }),
    );
  }

  private carregarVisualCache(): VisualCardapio {
    if (isPlatformServer(this.platformId)) return { ...PADRAO_VISUAL };
    const bruto = window.localStorage.getItem(CHAVE_VISUAL);
    if (!bruto) return { ...PADRAO_VISUAL };
    try {
      return { ...PADRAO_VISUAL, ...(JSON.parse(bruto) as Partial<VisualCardapio>) };
    } catch {
      return { ...PADRAO_VISUAL };
    }
  }

  // Carrega nome e telefone do estabelecimento (GET público). O cache local já
  // foi lido na construção; aqui apenas atualiza em segundo plano da API.
  carregarNome(): void {
    if (isPlatformServer(this.platformId)) return;

    this.http.get<InfoCardapio>(this.URL_NOME).subscribe({
      next: (res) => {
        if (res.nome) {
          this.nome.set(res.nome);
          window.localStorage.setItem(CHAVE_NOME, res.nome);
        }
        if (res.telefone) {
          this.telefone.set(res.telefone);
          window.localStorage.setItem(CHAVE_TELEFONE, res.telefone);
        }
      },
      error: (err) =>
        console.error('Erro ao consultar nome do estabelecimento:', err),
    });
  }

  private carregarNomeCache(): string | null {
    if (isPlatformServer(this.platformId)) return null;
    return window.localStorage.getItem(CHAVE_NOME);
  }

  private carregarTelefoneCache(): string | null {
    if (isPlatformServer(this.platformId)) return null;
    return window.localStorage.getItem(CHAVE_TELEFONE);
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

// ----- Helpers de cor (aplicados como CSS variables globais) -----

function hexParaRgb(hex: string): [number, number, number] {
  const match = /^#?([0-9a-f]{6})$/i.exec((hex ?? '').trim());
  if (!match) return [244, 63, 94];
  const n = parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function paraHex(rgb: [number, number, number]): string {
  return (
    '#' +
    ((1 << 24) | (rgb[0] << 16) | (rgb[1] << 8) | rgb[2])
      .toString(16)
      .slice(1)
  );
}

// Versão mais escura da cor (fator 0 = igual, 1 = preto)
export function escurecer(cor: string, fator: number): string {
  const [r, g, b] = hexParaRgb(cor);
  const d = 1 - fator;
  return paraHex([Math.round(r * d), Math.round(g * d), Math.round(b * d)]);
}

// Versão mesclada com branco (fator 0 = igual, 1 = branco puro)
export function clarear(cor: string, fator: number): string {
  const [r, g, b] = hexParaRgb(cor);
  const misturar = (c: number) => Math.round(c + (255 - c) * fator);
  return paraHex([misturar(r), misturar(g), misturar(b)]);
}

// Aplica a cor principal como variável CSS global (ou remove quando null).
// Valores inline ganham do CSS base, inclusive no tema escuro.
export function aplicarCorPrimaria(cor: string | null): void {
  if (typeof document === 'undefined') return;
  const estilo = document.documentElement.style;
  if (!cor) {
    estilo.removeProperty('--primary');
    estilo.removeProperty('--primary-dark');
    estilo.removeProperty('--primary-light');
    return;
  }
  estilo.setProperty('--primary', cor);
  estilo.setProperty('--primary-dark', escurecer(cor, 0.12));
  estilo.setProperty('--primary-light', clarear(cor, 0.82));
}