/** Estabelecimento (tenant) como aparece dentro das respostas de `auth`. */
export interface EstabelecimentoResumo {
  id: string;
  nome: string;
  slug: string;
  telefone: string | null;
}

/**
 * Corpo de TODAS as respostas de erro da API.
 * Vale para 400/401/403/404/413/429/500.
 */
export interface RespostaErro {
  statusCode: number;
  erro: string;
  mensagem: string | string[];
  caminho: string;
  timestamp: string;
}

/** Confirmação simples devolvida por endpoints sem payload próprio. */
export interface Mensagem {
  mensagem: string;
}
