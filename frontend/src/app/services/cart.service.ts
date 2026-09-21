import { Injectable, signal, computed } from '@angular/core';
import { Produto } from './produto.service';

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

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly _items = signal<CartItem[]>([]);
  private readonly CHAVE_STORAGE = 'cart_items';

  constructor() {
    // Recupera o carrinho salvo no navegador (persistência entre recarregamentos)
    this._items.set(this.carregarDoStorage());
  }

  // Lista de itens no carrinho
  readonly items = computed(() => this._items());

  // Quantidade total de itens
  readonly totalItems = computed(() =>
    this._items().reduce((acc, item) => acc + item.quantidade, 0),
  );

  // Valor total do carrinho (soma o preço unitário com adicionais)
  readonly totalPrice = computed(() =>
    this._items().reduce((acc, item) => acc + item.precoUnitario * item.quantidade, 0),
  );

  // Adiciona um produto ao carrinho (incrementa a quantidade se já existir)
  add(produto: Produto): void {
    this.addPersonalizado(produto, 1, [], []);
  }

  // Adiciona um produto com personalização (remover/adicionar ingredientes)
  addPersonalizado(
    produto: Produto,
    quantidade: number,
    removidos: ItemIngrediente[],
    adicionados: ItemIngrediente[],
  ): void {
    const precoUnitario = this.calcularPrecoUnitario(produto, adicionados);

    this._items.update((items) => {
      const existente = items.find(
        (item) =>
          item.produto.id === produto.id &&
          this.mesmaPersonalizacao(item.personalizacao, { removidos, adicionados }),
      );
      if (existente) {
        return items.map((item) =>
          item === existente
            ? { ...item, quantidade: item.quantidade + quantidade }
            : item,
        );
      }
      return [
        ...items,
        {
          uid: this.gerarId(),
          produto,
          quantidade,
          precoUnitario,
          personalizacao: { removidos, adicionados },
        },
      ];
    });
    this.persistir();
  }

  private gerarId(): string {
    return Math.random().toString(36).slice(2, 10);
  }

  private calcularPrecoUnitario(
    produto: Produto,
    adicionados: { ingredienteId: string; nome: string; preco: number }[],
  ): number {
    return produto.preco + adicionados.reduce((acc, a) => acc + a.preco, 0);
  }

  private mesmaPersonalizacao(
    a: CartItemPersonalizacao,
    b: CartItemPersonalizacao,
  ): boolean {
    const mesmoRemovidos =
      a.removidos.length === b.removidos.length &&
      a.removidos.every((r) => b.removidos.some((br) => br.ingredienteId === r.ingredienteId));
    const mesmoAdicionados =
      a.adicionados.length === b.adicionados.length &&
      a.adicionados.every((ad) =>
        b.adicionados.some((bad) => bad.ingredienteId === ad.ingredienteId),
      );
    return mesmoRemovidos && mesmoAdicionados;
  }

  // Atualiza a quantidade de um item; remove se a quantidade for <= 0
  updateQuantity(uid: string, quantidade: number): void {
    if (quantidade <= 0) {
      this.remove(uid);
      return;
    }
    this._items.update((items) =>
      items.map((item) =>
        item.uid === uid ? { ...item, quantidade } : item,
      ),
    );
    this.persistir();
  }

  // Remove um item do carrinho
  remove(uid: string): void {
    this._items.update((items) =>
      items.filter((item) => item.uid !== uid),
    );
    this.persistir();
  }

  // Limpa o carrinho
  clear(): void {
    this._items.set([]);
    this.persistir();
  }

  private carregarDoStorage(): CartItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const bruto = window.localStorage.getItem(this.CHAVE_STORAGE);
      if (!bruto) return [];
      const dados = JSON.parse(bruto);
      return Array.isArray(dados) ? dados : [];
    } catch {
      return [];
    }
  }

  private persistir(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        this.CHAVE_STORAGE,
        JSON.stringify(this._items()),
      );
    } catch {}
  }
}
