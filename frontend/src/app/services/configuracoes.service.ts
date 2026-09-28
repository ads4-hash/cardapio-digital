import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../environment';
import { EstabelecimentoContextoService } from './estabelecimento-contexto.service';

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

const PREFIXO_CACHE = 'estab';
const PADRAO_VISUAL: VisualCardapio = {
  cor: null,
  logoUrl: null,
  capaUrl: null,
  tema: 'auto',
};

// Chave do localStorage por estabelecimento (slug)
function chave(slug: string, campo: string): string {
  return `${PREFIXO_CACHE}:${slug}:${campo}`;
}

// Estado por estabelecimento: controla se o cardápio aceita pedidos, valor da
// entrega, nome/telefone e identidade visual. Compartilhado já que admin
// (on/offline e taxa no Faturamento) e cliente (bloqueio do "Adicionar",
// carrinho) consultam a API — cada chamada pública leva o slug do contexto.
@Injectable({
  providedIn: 'root',
})
export class ConfiguracoesService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly contexto = inject(EstabelecimentoContextoService);
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
  nome = signal<string | null>(null);
  // Telefone de contato do estabelecimento — usado no botão de WhatsApp da
  // tela de acompanhamento de pedido (público)
  telefone = signal<string | null>(null);
  // Identidade visual do cardápio público
  visualCardapio = signal<VisualCardapio>({ ...PADRAO_VISUAL });

  // Caches em memória por slug (evita repetir HTTP ao alternar entre telas)
  private aceitandoCache = new Map<string, boolean>();
  private taxaCache = new Map<string, number>();
  private nomeCache = new Map<string, string>();
  private telefoneCache = new Map<string, string>();
  private visualCache = new Map<string, VisualCardapio>();
  private emVoo = new Set<string>();

  private defaultSlug(): string | null {
    return this.contexto.slugAtual();
  }

  // Consulta o estado atual e aplica nos signals (GET público)
  carregar(slug = this.defaultSlug() ?? ''): void {
    if (isPlatformServer(this.platformId) || !slug) return;

    const naCache = this.aceitandoCache.get(slug);
    if (naCache !== undefined) {
      this.aceitandoPedidos.set(naCache);
      this.carregado.set(true);
    }

    if (this.emVoo.has(`a:${slug}`)) return;
    this.emVoo.add(`a:${slug}`);
    this.http.get<AceitandoPedidos>(`${this.URL}?slug=${encodeURIComponent(slug)}`).subscribe({
      next: (res) => {
        this.aceitandoCache.set(slug, res.aceitandoPedidos);
        this.aceitandoPedidos.set(res.aceitandoPedidos);
        this.carregado.set(true);
      },
      error: (err) => {
        console.error('Erro ao consultar estado do cardápio:', err);
        this.carregado.set(true);
      },
      complete: () => this.emVoo.delete(`a:${slug}`),
    });
  }

  // Consulta a taxa de entrega atual (GET público, usada no carrinho)
  carregarTaxaEntrega(slug = this.defaultSlug() ?? ''): void {
    if (isPlatformServer(this.platformId) || !slug) return;

    const naCache = this.taxaCache.get(slug);
    if (naCache !== undefined) this.taxaEntrega.set(naCache);

    if (this.emVoo.has(`t:${slug}`)) return;
    this.emVoo.add(`t:${slug}`);
    this.http.get<TaxaEntrega>(`${this.URL_TAXA}?slug=${encodeURIComponent(slug)}`).subscribe({
      next: (res) => {
        this.taxaCache.set(slug, res.taxaEntrega);
        this.taxaEntrega.set(res.taxaEntrega);
      },
      error: (err) => console.error('Erro ao consultar taxa de entrega:', err),
      complete: () => this.emVoo.delete(`t:${slug}`),
    });
  }

  // Consulta a identidade visual do cardápio (GET público), lendo antes o cache
  carregarVisualCardapio(slug = this.defaultSlug() ?? ''): void {
    if (isPlatformServer(this.platformId) || !slug) return;

    const naCache = this.visualCache.get(slug);
    if (naCache) this.visualCardapio.set(naCache);
    else this.visualCardapio.set(this.carregarVisualDoLocal(slug));

    if (this.emVoo.has(`v:${slug}`)) return;
    this.emVoo.add(`v:${slug}`);
    this.http.get<VisualCardapio>(`${this.URL_VISUAL}?slug=${encodeURIComponent(slug)}`).subscribe({
      next: (res) => {
        this.visualCache.set(slug, res);
        this.visualCardapio.set(res);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(chave(slug, 'visual'), JSON.stringify(res));
        }
      },
      error: (err) => console.error('Erro ao consultar visual do cardápio:', err),
      complete: () => this.emVoo.delete(`v:${slug}`),
    });
  }

  // Salva a identidade visual (PATCH autenticado — tela de Personalização)
  salvarVisualCardapio(
    dados: Partial<VisualCardapio>,
    slug = this.defaultSlug() ?? '',
  ): Observable<VisualCardapio> {
    return this.http.patch<VisualCardapio>(this.URL_VISUAL, dados).pipe(
      tap((res) => {
        this.visualCache.set(slug, res);
        this.visualCardapio.set(res);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(chave(slug, 'visual'), JSON.stringify(res));
        }
      }),
    );
  }

  private carregarVisualDoLocal(slug: string): VisualCardapio {
    if (isPlatformServer(this.platformId) || typeof window === 'undefined') {
      return { ...PADRAO_VISUAL };
    }
    const bruto = window.localStorage.getItem(chave(slug, 'visual'));
    if (!bruto) return { ...PADRAO_VISUAL };
    try {
      return { ...PADRAO_VISUAL, ...(JSON.parse(bruto) as Partial<VisualCardapio>) };
    } catch {
      return { ...PADRAO_VISUAL };
    }
  }

  // Carrega nome e telefone do estabelecimento (GET público), usando antes o
  // cache local pré-gravado para mostrá-los sem esperar a API.
  carregarNome(slug = this.defaultSlug() ?? ''): void {
    if (isPlatformServer(this.platformId) || !slug) return;

    const nomeCache = this.nomeCache.get(slug);
    if (nomeCache !== undefined) this.nome.set(nomeCache);
    else {
      const doLocal = this.carregarTextoLocal(chave(slug, 'nome'));
      if (doLocal) {
        this.nomeCache.set(slug, doLocal);
        this.nome.set(doLocal);
      }
    }
    const telefoneCache = this.telefoneCache.get(slug);
    if (telefoneCache !== undefined) this.telefone.set(telefoneCache);
    else {
      const doLocal = this.carregarTextoLocal(chave(slug, 'telefone'));
      if (doLocal) {
        this.telefoneCache.set(slug, doLocal);
        this.telefone.set(doLocal);
      }
    }

    if (this.emVoo.has(`n:${slug}`)) return;
    this.emVoo.add(`n:${slug}`);
    this.http.get<InfoCardapio>(`${this.URL_NOME}?slug=${encodeURIComponent(slug)}`).subscribe({
      next: (res) => {
        if (res.nome) {
          this.nomeCache.set(slug, res.nome);
          this.nome.set(res.nome);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(chave(slug, 'nome'), res.nome);
          }
        }
        if (res.telefone) {
          this.telefoneCache.set(slug, res.telefone);
          this.telefone.set(res.telefone);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(chave(slug, 'telefone'), res.telefone);
          }
        }
      },
      error: (err) => console.error('Erro ao consultar nome do estabelecimento:', err),
      complete: () => this.emVoo.delete(`n:${slug}`),
    });
  }

  private carregarTextoLocal(campo: string): string | null {
    if (isPlatformServer(this.platformId) || typeof window === 'undefined') return null;
    return window.localStorage.getItem(campo);
  }

  // Define a taxa de entrega (PATCH autenticado — tela de Faturamento)
  definirTaxaEntrega(valor: number, slug = this.defaultSlug() ?? ''): void {
    if (isPlatformServer(this.platformId) || !slug) return;
    this.taxaCache.set(slug, valor);
    this.taxaEntrega.set(valor);
    this.http
      .patch<TaxaEntrega>(this.URL_TAXA, { taxaEntrega: valor })
      .subscribe({
        error: (err) => {
          console.error('Erro ao salvar taxa de entrega:', err);
          this.carregarTaxaEntrega(slug);
        },
      });
  }

  // Alterna online/offline (PATCH autenticado pelo interceptor global)
  alternar(slug = this.defaultSlug() ?? ''): void {
    if (isPlatformServer(this.platformId) || !slug) return;
    const atual = this.aceitandoCache.get(slug) ?? this.aceitandoPedidos();
    const novoEstado = !atual;

    // Aplicação otimista: atualiza a UI antes de confirmar na API
    this.aceitandoCache.set(slug, novoEstado);
    this.aceitandoPedidos.set(novoEstado);
    this.http
      .patch<AceitandoPedidos>(this.URL, { aceitandoPedidos: novoEstado })
      .subscribe({
        error: (err) => {
          console.error('Erro ao alternar estado do cardápio:', err);
          this.aceitandoCache.set(slug, atual);
          this.aceitandoPedidos.set(atual);
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