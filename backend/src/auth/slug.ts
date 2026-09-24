// Gera um slug amigável e único-por-estabelecimento a partir de um nome.
// Remove acentos, converte para minúsculas e troca espaços/símbolos por hífen.
export function gerarSlug(nome: string): string {
  const slug = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'estabelecimento';
}
