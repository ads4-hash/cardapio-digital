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

/** Tipos de chave Pix aceitos pelo Brasil (Banco Central). */
export type TipoChavePix = 'CPF' | 'CNPJ' | 'TELEFONE' | 'EMAIL' | 'ALEATORIA';

/** `GET`/`PATCH /configuracoes/pix` — dados para o cliente pagar com Pix. */
export interface PixConfiguracao {
  tipoChave: TipoChavePix | null;
  chave: string | null;
  titular: string | null;
  instituicao: string | null;
  qrUrl: string | null;
}
