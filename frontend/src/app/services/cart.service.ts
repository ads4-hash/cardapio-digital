import { Injectable, signal, computed } from '@angular/core';
import { Produto } from './produto.service';

export interface CartItem {
  produto: Produto;
  quantidade: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly _items = signal<CartItem[]>([]);

  // Lista de itens no carrinho
  readonly items = computed(() => this._items());

  // Quantidade total de itens
  readonly totalItems = computed(() =>
    this._items().reduce((acc, item) => acc + item.quantidade, 0),
  );

  // Valor total do carrinho
  readonly totalPrice = computed(() =>
    this._items().reduce((acc, item) => acc + item.produto.preco * item.quantidade, 0),
  );

  // Adiciona um produto ao carrinho (incrementa a quantidade se já existir)
  add(produto: Produto): void {
    this._items.update((items) => {
      const existente = items.find((item) => item.produto.id === produto.id);
      if (existente) {
        return items.map((item) =>
          item.produto.id === produto.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item,
        );
      }
      return [...items, { produto, quantidade: 1 }];
    });
  }

  // Atualiza a quantidade de um item; remove se a quantidade for <= 0
  updateQuantity(produtoId: string, quantidade: number): void {
    if (quantidade <= 0) {
      this.remove(produtoId);
      return;
    }
    this._items.update((items) =>
      items.map((item) =>
        item.produto.id === produtoId ? { ...item, quantidade } : item,
      ),
    );
  }

  // Remove um item do carrinho
  remove(produtoId: string): void {
    this._items.update((items) =>
      items.filter((item) => item.produto.id !== produtoId),
    );
  }

  // Limpa o carrinho
  clear(): void {
    this._items.set([]);
  }
}
