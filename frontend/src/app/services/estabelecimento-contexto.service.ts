import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

// Contexto "de qual estabelecimento estamos falando". Guarda o slug do
// estabelecimento aberto na URL pública (/cardapio/:slug) para as consultas do
// cliente, e recorre ao estabelecimento do usuário logado para o painel admin.
@Injectable({ providedIn: 'root' })
export class EstabelecimentoContextoService {
  private readonly auth = inject(AuthService);

  private readonly publico = signal<string | null>(null);

  definirSlugPublico(slug: string): void {
    this.publico.set(slug);
  }

  limparSlugPublico(): void {
    this.publico.set(null);
  }

  // Prioriza o slug da URL pública (cardápio/acompanhamento); quando não há,
  // usa o estabelecimento do usuário autenticado (painel admin).
  readonly slugAtual = computed<string | null>(() => {
    const publico = this.publico();
    if (publico) return publico;
    return this.auth.usuarioLogado()?.estabelecimento?.slug ?? null;
  });
}