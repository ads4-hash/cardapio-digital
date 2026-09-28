import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PersonalizacaoProdutoComponent } from './personalizacao-produto.component';
import { CartItem, CartService } from '../../services/cart.service';
import type { Produto, ProdutoIngrediente } from '../../services/produto.service';

function vinculo(nome: string, precoAdicional: number): ProdutoIngrediente {
  return {
    precoAdicional,
    ingredienteId: `ing-${nome}`,
    ingrediente: { id: `ing-${nome}`, nome, disponivel: true } as never,
  };
}

function produtoCom(
  ...ingredientes: ProdutoIngrediente[]
): Produto {
  return {
    id: 'p1',
    nome: 'Pizza',
    preco: 40,
    descricao: null,
    imagemUrl: null,
    categoriaId: 'c1',
    categoria: { id: 'c1', nome: 'Pizzas' },
    ingredientes,
  } as unknown as Produto;
}

function montar(produto: Produto, itemEmEdicao: CartItem | null = null) {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: CartService,
        useValue: { addPersonalizado: vi.fn(), atualizarItem: vi.fn() },
      },
    ],
  });
  const fixture = TestBed.createComponent(PersonalizacaoProdutoComponent);
  fixture.componentRef.setInput('produto', produto);
  fixture.componentRef.setInput('itemEmEdicao', itemEmEdicao);
  fixture.detectChanges();
  return fixture.componentInstance;
}

/** Estado atual do ingrediente, na ordem em que a lista os guarda. */
function estado(c: ReturnType<typeof montar>, id: string) {
  return c.ingredientes().find((i) => i.vinculo.ingredienteId === id)!;
}

describe('PersonalizacaoProdutoComponent - stepper de ingredientes', () => {
  describe('ingrediente sem adicional (precoAdicional = 0)', () => {
    it('volta a incluir quando o cliente corrige um remoção por engano', () => {
      const c = montar(produtoCom(vinculo('Cebola', 0)));
      const ing = estado(c, 'ing-Cebola');

      expect(ing.quantidade).toBe(1);

      c.diminuir(ing);
      expect(estado(c, 'ing-Cebola').quantidade).toBe(0);
      expect(c.removido(estado(c, 'ing-Cebola'))).toBe(true);

      // Este era o beco sem saída: com preço 0 o "+" ficava desabilitado.
      expect(c.naoPodeSomar(estado(c, 'ing-Cebola'))).toBe(false);

      c.aumentar(estado(c, 'ing-Cebola'));
      expect(estado(c, 'ing-Cebola').quantidade).toBe(1);
      expect(c.removido(estado(c, 'ing-Cebola'))).toBe(false);
    });

    it('não deixa somar cópia extra de ingrediente sem preço', () => {
      const c = montar(produtoCom(vinculo('Cebola', 0)));
      const ing = estado(c, 'ing-Cebola');

      expect(c.naoPodeSomar(ing)).toBe(true);
      c.aumentar(ing);

      expect(estado(c, 'ing-Cebola').quantidade).toBe(1);
    });
  });

  describe('ingrediente com adicional', () => {
    it('some até 99 cópias extras', () => {
      const c = montar(produtoCom(vinculo('Queijo', 5)));
      const ing = estado(c, 'ing-Queijo');

      c.aumentar(ing);
      expect(estado(c, 'ing-Queijo').quantidade).toBe(2);
      expect(c.adicional(estado(c, 'ing-Queijo'))).toBe(true);

      c.aumentar(estado(c, 'ing-Queijo'));
      expect(estado(c, 'ing-Queijo').quantidade).toBe(3);
      expect(c.precoTotal()).toBe(50); // 40 + 2 cópias extras de 5
    });

    it('restaura removido e volta a somar extras normalmente', () => {
      const c = montar(produtoCom(vinculo('Queijo', 5)));

      c.diminuir(estado(c, 'ing-Queijo'));
      expect(estado(c, 'ing-Queijo').quantidade).toBe(0);

      c.aumentar(estado(c, 'ing-Queijo'));
      expect(estado(c, 'ing-Queijo').quantidade).toBe(1);

      c.aumentar(estado(c, 'ing-Queijo'));
      expect(estado(c, 'ing-Queijo').quantidade).toBe(2);
    });

    it('trava em 99', () => {
      const c = montar(produtoCom(vinculo('Queijo', 5)));
      for (let i = 0; i < 120; i++) c.aumentar(estado(c, 'ing-Queijo'));

      expect(estado(c, 'ing-Queijo').quantidade).toBe(99);
      expect(c.naoPodeSomar(estado(c, 'ing-Queijo'))).toBe(true);
    });
  });

  it('monta o pedido com o ingrediente restaurado fora de "sem"', () => {
    const c = montar(produtoCom(vinculo('Cebola', 0), vinculo('Queijo', 5)));

    c.diminuir(estado(c, 'ing-Cebola'));
    c.aumentar(estado(c, 'ing-Cebola')); // corrigido pelo cliente
    c.aumentar(estado(c, 'ing-Queijo')); // um extra de queijo

    c.adicionar();

    const [, , removidos, adicionados] = (
      TestBed.inject(CartService).addPersonalizado as ReturnType<typeof vi.fn>
    ).mock.calls[0];

    expect(removidos.map((r: { ingredienteId: string }) => r.ingredienteId)).toEqual([]);
    expect(adicionados).toEqual([
      {
        ingredienteId: 'ing-Queijo',
        nome: 'Queijo',
        preco: 5,
      },
    ]);
  });

  describe('correção de item já no carrinho', () => {
    function itemNoCarrinho(
      produto: Produto,
      removidos: CartItem['personalizacao']['removidos'] = [],
      adicionados: CartItem['personalizacao']['adicionados'] = [],
      quantidade = 2,
    ): CartItem {
      return {
        uid: 'uid-1',
        produto,
        quantidade,
        precoUnitario: produto.preco,
        personalizacao: { removidos, adicionados },
      };
    }

    it('abre o modal já com removidos em 0 e adicionais somados à base', () => {
      const produto = produtoCom(vinculo('Cebola', 0), vinculo('Queijo', 5));
      const item = itemNoCarrinho(
        produto,
        [{ ingredienteId: 'ing-Cebola', nome: 'Cebola', preco: 0 }],
        [{ ingredienteId: 'ing-Queijo', nome: 'Queijo', preco: 5 }],
        3,
      );

      const c = montar(produto, item);

      expect(c.editando()).toBe(true);
      expect(estado(c, 'ing-Cebola').quantidade).toBe(0);
      expect(estado(c, 'ing-Queijo').quantidade).toBe(2);
      expect(c.quantidade()).toBe(3);
    });

    it('substitui o item em vez de criar outro', () => {
      const produto = produtoCom(vinculo('Cebola', 0), vinculo('Queijo', 5));
      const item = itemNoCarrinho(
        produto,
        [{ ingredienteId: 'ing-Cebola', nome: 'Cebola', preco: 0 }],
      );

      const c = montar(produto, item);
      const cart = TestBed.inject(CartService);

      // Cliente percebe que removeu a cebola sem querer e a devolve.
      c.aumentar(estado(c, 'ing-Cebola'));
      c.aumentar(estado(c, 'ing-Queijo'));
      c.adicionar();

      expect(cart.addPersonalizado).not.toHaveBeenCalled();
      expect(cart.atualizarItem).toHaveBeenCalledTimes(1);

      const [uid, quantidade, removidos, adicionados] = (
        cart.atualizarItem as ReturnType<typeof vi.fn>
      ).mock.calls[0];

      expect(uid).toBe('uid-1');
      expect(quantidade).toBe(2);
      expect(removidos).toEqual([]);
      expect(adicionados).toEqual([
        { ingredienteId: 'ing-Queijo', nome: 'Queijo', preco: 5 },
      ]);
    });

    it('mantém o removido que o cliente não desfez', () => {
      const produto = produtoCom(vinculo('Cebola', 0), vinculo('Queijo', 5));
      const item = itemNoCarrinho(
        produto,
        [{ ingredienteId: 'ing-Cebola', nome: 'Cebola', preco: 0 }],
      );

      const c = montar(produto, item);
      c.adicionar();

      const [, , removidos] = (
        TestBed.inject(CartService).atualizarItem as ReturnType<typeof vi.fn>
      ).mock.calls[0];

      expect(removidos).toEqual([
        { ingredienteId: 'ing-Cebola', nome: 'Cebola', preco: 0 },
      ]);
    });
  });
});
