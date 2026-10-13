/** Identidade visual do cardápio público (`GET`/`PATCH /configuracoes/cardapio`). */
export interface VisualCardapio {
  cor: string | null;
  logoUrl: string | null;
  capaUrl: string | null;
  tema: 'claro' | 'escuro' | 'auto';
}

/** `GET`/`PATCH /configuracoes/aceitando-pedidos`. */
export interface AceitandoPedidos {
  aceitandoPedidos: boolean;
}

/** `GET`/`PATCH /configuracoes/taxa-entrega`. */
export interface TaxaEntrega {
  taxaEntrega: number;
}
