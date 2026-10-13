import type { ProdutoGrupo } from '../models/produto.model';

// Grupos de escolha na ordem em que o cardápio os apresenta.
export function gruposOrdenados(
  grupos: ProdutoGrupo[] | undefined,
): ProdutoGrupo[] {
  return [...(grupos ?? [])].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
}
