import type { ItemIngrediente } from '../models/cart.model';

// Lista os nomes dos ingredientes separados por vírgula.
export function nomesIngredientes(lista: ItemIngrediente[]): string {
  return lista.map((i) => i.nome).join(', ');
}

// Agrupa ingredientes repetidos em "2x Nome" para exibir no carrinho.
export function agruparAdicionados(lista: ItemIngrediente[]): string {
  const contagem = new Map<string, number>();
  for (const item of lista) {
    contagem.set(item.nome, (contagem.get(item.nome) ?? 0) + 1);
  }
  return [...contagem.entries()]
    .map(([nome, qtd]) => (qtd > 1 ? `${qtd}x ${nome}` : nome))
    .join(', ');
}
