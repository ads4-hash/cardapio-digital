import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Meta, Title } from '@angular/platform-browser';
import { firstValueFrom, forkJoin } from 'rxjs';

import { environment } from '../environment';
import { resolverImagemUrl } from './produto.service';
import type { VisualCardapio } from '../models/configuracao.model';

interface InfoCardapio {
  nome: string | null;
  telefone: string | null;
}

const SUFIXO_TITULO = 'Cardápio Digital';

/**
 * Metadados de SEO/redes sociais por estabelecimento, gerados no SSR.
 *
 * O Angular entrega o mesmo index.html para todas as rotas: sem isto, o
 * Google e o WhatsApp enxergariam "<title>Frontend</title>" em todo link de
 * cardápio. Aqui o HTML server-rendered sai com o nome da casa no título,
 * na descrição e nas tags og:* (o preview do WhatsApp lê og:title/og:image).
 *
 * Duas observações importantes:
 *
 * - Só roda no servidor (guard `typeof window`): no browser o HTML já veio
 *   com as tags certas do SSR; na navegação SPA o título do documento não é
 *   o alvo de SEO.
 * - A chamada usa `environment.apiUrl` (servidor) e o og:image passa por
 *   `resolverImagemUrl`, que gera URL absoluta com `publicApiUrl` — a tag og
 *   exige URL completa alcançável pelo crawler/navegador, não o caminho
 *   relativo /uploads/... que a API devolve.
 */
@Injectable({ providedIn: 'root' })
export class MetadataCardapioService {
  private readonly http = inject(HttpClient);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  private readonly URL_INFO = `${environment.apiUrl}/auth/cardapio`;
  private readonly URL_VISUAL = `${environment.apiUrl}/configuracoes/cardapio`;

  /**
   * Aplica título e tags do cardápio durante o render do servidor. As
   * requisições HTTP do Angular seguram a resposta do SSR até terminarem,
   * então o HTML sai pronto (e não "vazio com título certo"): é isso que dá
   * tempo ao crawler de ver o conteúdo.
   *
   * Slug desconhecido ou API indisponível mantém os metadados padrão do
   * index.html — um cardápio quebrado não deve derrubar o render.
   */
  async aplicar(slug: string): Promise<void> {
    if (typeof window !== 'undefined' || !slug) return;

    const consulta = forkJoin({
      info: this.http.get<InfoCardapio>(
        `${this.URL_INFO}?slug=${encodeURIComponent(slug)}`,
      ),
      visual: this.http.get<VisualCardapio>(
        `${this.URL_VISUAL}?slug=${encodeURIComponent(slug)}`,
      ),
    });

    const dados = await firstValueFrom(consulta).catch(() => null);
    if (!dados) return;

    const nome = dados.info.nome?.trim() || slug;
    const titulo = `${nome} — ${SUFIXO_TITULO}`;
    let descricao = `Cardápio de ${nome}. Veja os pratos e faça seu pedido online.`;
    if (dados.info.telefone) {
      descricao += ` Contato: ${dados.info.telefone}.`;
    }

    // Preferência pela logo; sem logo, a capa. Sem imagem nenhuma, a tag
    // og:image fica de fora (preview sem miniatura é melhor que URL quebrada).
    const imagem = resolverImagemUrl(
      dados.visual.logoUrl ?? dados.visual.capaUrl,
    );

    this.title.setTitle(titulo);
    this.meta.updateTag({ name: 'description', content: descricao });
    this.meta.updateTag({ name: 'theme-color', content: dados.visual.cor ?? '#f43f5e' });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: SUFIXO_TITULO });
    this.meta.updateTag({ property: 'og:title', content: titulo });
    this.meta.updateTag({ property: 'og:description', content: descricao });
    if (imagem) {
      this.meta.updateTag({ property: 'og:image', content: imagem });
    }
  }
}
