/**
 * Caminho relativo de imagem servido pela própria API, ex.:
 * `/uploads/est-abc/1756460000000-123.png` (com a subpasta do tenant, formato
 * atual dos uploads) ou `/uploads/arquivo.png` (formato legado). Só letras,
 * números, hífen, ponto e `_` — sem espaços nem caracteres de escape.
 */
export const URL_IMAGEM_REGEX =
  /^\/uploads\/(?:[a-zA-Z0-9-]+\/)?[a-zA-Z0-9._-]+$/;

export const URL_IMAGEM_MENSAGEM =
  'A imagem deve ser um caminho relativo em /uploads/.';
