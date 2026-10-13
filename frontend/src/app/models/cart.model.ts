import type { Produto } from './produto.model';

export interface ItemIngrediente {
  ingredienteId: string;
  nome: string;
  preco: number;
}

export interface CartItemPersonalizacao {
  removidos: ItemIngrediente[];
  adicionados: ItemIngrediente[];
}

export interface CartItem {
  uid: string;
  produto: Produto;
  quantidade: number;
  precoUnitario: number;
  personalizacao: CartItemPersonalizacao;
}
