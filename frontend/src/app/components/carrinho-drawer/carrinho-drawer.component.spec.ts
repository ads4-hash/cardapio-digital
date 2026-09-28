import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CarrinhoDrawerComponent } from './carrinho-drawer.component';

function valores(opcoes: { valor: string }[]): string[] {
  return opcoes.map((o) => o.valor);
}

describe('CarrinhoDrawerComponent - formas de pagamento por tipo de entrega', () => {
  let c: CarrinhoDrawerComponent;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    c = TestBed.createComponent(CarrinhoDrawerComponent).componentInstance;
  });

  it('na retirada mostra apenas Pix e Dinheiro', () => {
    c.selecionarTipoEntrega('RETIRADA');

    expect(valores(c.formasPagamento())).toEqual(['DINHEIRO', 'PIX']);
    expect(valores(c.formasPagamento())).not.toContain('CARTAO');
  });

  it('na entrega mostra todas as formas', () => {
    c.selecionarTipoEntrega('ENTREGA');

    expect(valores(c.formasPagamento())).toEqual(['DINHEIRO', 'PIX', 'CARTAO']);
  });

  it('sem tipo escolhido mostra todas, para não esconder opção indevidamente', () => {
    expect(c.tipoEntrega()).toBeNull();
    expect(valores(c.formasPagamento())).toEqual(['DINHEIRO', 'PIX', 'CARTAO']);
  });

  it('mantém o cartão na entrega', () => {
    c.selecionarTipoEntrega('ENTREGA');
    c.selecionarPagamento('CARTAO');

    expect(c.formaPagamento()).toBe('CARTAO');
  });

  it('não deixa cartão marcado depois de mudar para retirada', () => {
    c.selecionarTipoEntrega('ENTREGA');
    c.selecionarPagamento('CARTAO');

    c.selecionarTipoEntrega('RETIRADA');

    // O cartão saiu da lista, então a seleção não pode sobrar orfã.
    expect(c.formaPagamento()).toBe('DINHEIRO');
    expect(valores(c.formasPagamento())).toContain(c.formaPagamento());
  });

  it('preserva Pix ao passar para retirada, já que continua válido', () => {
    c.selecionarTipoEntrega('ENTREGA');
    c.selecionarPagamento('PIX');

    c.selecionarTipoEntrega('RETIRADA');

    expect(c.formaPagamento()).toBe('PIX');
  });

  it('volta a permitir cartão ao voltar para entrega', () => {
    c.selecionarTipoEntrega('ENTREGA');
    c.selecionarPagamento('CARTAO');
    c.selecionarTipoEntrega('RETIRADA');
    c.selecionarTipoEntrega('ENTREGA');

    expect(valores(c.formasPagamento())).toContain('CARTAO');
  });
});
