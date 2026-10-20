import type { ItemIngrediente } from '../models/cart.model';

// Lista os nomes dos ingredientes separados por vírgula.
export function nomesIngredientes(lista: ItemIngrediente[]): string {
  return lista.map((i) => i.nome).join(', ');
}

// Agrupa nomes repetidos em "2x Nome". Usado no carrinho e na mensagem de
// WhatsApp: pedir 4x queijo é 4 porções, não quatro linhas de "Queijo".
export function agruparNomesRepetidos(nomes: string[]): string {
  const contagem = new Map<string, number>();
  for (const nome of nomes) {
    contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
  }
  return [...contagem.entries()]
    .map(([nome, qtd]) => (qtd > 1 ? `${qtd}x ${nome}` : nome))
    .join(', ');
}

// Agrupa ingredientes repetidos em "2x Nome" para exibir no carrinho.
export function agruparAdicionados(lista: ItemIngrediente[]): string {
  return agruparNomesRepetidos(lista.map((i) => i.nome));
}
