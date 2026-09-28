import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CartService } from './cart.service';
import type { Produto } from './produto.service';

function produto(preco: number, id = 'p1'): Produto {
  return { id, nome: 'Pizza', preco } as unknown as Produto;
}

describe('CartService.atualizarItem', () => {
  let service: CartService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CartService);
  });

  it('substitui a personalização e recalcula o preço unitário', () => {
    service.add(produto(40));
    const uid = service.items()[0].uid;

    service.atualizarItem(uid, 1, [], [
      { ingredienteId: 'i1', nome: 'Queijo', preco: 6 },
      { ingredienteId: 'i1', nome: 'Queijo', preco: 6 },
    ]);

    const [atualizado] = service.items();
    expect(service.items()).toHaveLength(1);
    expect(atualizado.uid).toBe(uid);
    expect(atualizado.precoUnitario).toBe(52); // 40 + 2 x 6
    expect(atualizado.personalizacao.adicionados).toHaveLength(2);
  });

  it('atualiza também a quantidade, sem deixar zerar', () => {
    service.add(produto(40));
    const uid = service.items()[0].uid;

    service.atualizarItem(uid, 4, [], []);
    expect(service.items()[0].quantidade).toBe(4);

    service.atualizarItem(uid, 0, [], []);
    expect(service.items()[0].quantidade).toBe(1);
    expect(service.items()).toHaveLength(1);
  });

  it('não cria item novo nem mexe nos demais', () => {
    service.add(produto(10, 'p1'));
    service.add(produto(20, 'p2'));
    const [primeiro, segundo] = service.items();

    service.atualizarItem(segundo.uid, 1, [], []);

    expect(service.items()).toHaveLength(2);
    expect(service.items()[0]).toEqual(primeiro);
    expect(service.items()[1].uid).toBe(segundo.uid);
  });

  it('ignora uid inexistente', () => {
    service.add(produto(40));
    const antes = service.items();

    service.atualizarItem('nao-existe', 9, [], []);

    expect(service.items()).toEqual(antes);
  });

  it('não acumula itens quando a correção é repetida', () => {
    service.add(produto(40));
    const uid = service.items()[0].uid;

    // Cliente abre, corrige, fecha sem querer e refaz a correção.
    service.atualizarItem(uid, 1, [], [{ ingredienteId: 'i1', nome: 'Queijo', preco: 6 }]);
    service.atualizarItem(uid, 1, [], [{ ingredienteId: 'i1', nome: 'Queijo', preco: 6 }]);
    service.atualizarItem(uid, 1, [], [{ ingredienteId: 'i1', nome: 'Queijo', preco: 6 }]);

    expect(service.items()).toHaveLength(1);
    expect(service.items()[0].uid).toBe(uid);
    expect(service.items()[0].precoUnitario).toBe(46);
  });

  it('persiste a correção no storage', () => {
    service.add(produto(40));
    const uid = service.items()[0].uid;

    service.atualizarItem(uid, 2, [{ ingredienteId: 'i1', nome: 'Cebola', preco: 0 }], []);

    const salvo = JSON.parse(localStorage.getItem('cart_items')!);
    expect(salvo).toHaveLength(1);
    expect(salvo[0].quantidade).toBe(2);
    expect(salvo[0].personalizacao.removidos[0].nome).toBe('Cebola');
  });
});
