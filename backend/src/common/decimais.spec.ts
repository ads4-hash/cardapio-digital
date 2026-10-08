import { Prisma } from '@prisma/client';
import { decimaisParaNumero } from './decimais';

describe('decimaisParaNumero', () => {
  it('converte Decimal em number', () => {
    expect(decimaisParaNumero(new Prisma.Decimal('25.9'))).toBe(25.9);
  });

  it('converte Decimals aninhados em objetos e listas', () => {
    const pedido = {
      id: 'ped-1',
      total: new Prisma.Decimal('37.5'),
      trocoPara: null,
      itens: [
        { preco: new Prisma.Decimal('12.5'), quantidade: 2 },
        { preco: new Prisma.Decimal('10'), quantidade: 1 },
      ],
      criadoEm: new Date('2026-01-01T00:00:00Z'),
    };

    // Na API o payload chega tipado como Decimal; após a conversão ele é número
    // de verdade (é o que o JSON vai entregar ao frontend).
    const convertido = decimaisParaNumero(pedido) as unknown as {
      total: number;
      trocoPara: number | null;
      itens: { preco: number; quantidade: number }[];
      criadoEm: Date;
    };

    expect(convertido.total).toBe(37.5);
    expect(convertido.trocoPara).toBeNull();
    expect(convertido.itens.map((item) => item.preco)).toEqual([12.5, 10]);
    // Datas continuam sendo datas (não viram string nem objeto)
    expect(convertido.criadoEm).toBeInstanceOf(Date);
    // A soma que o painel faz continua dando número, não string
    expect(0 + convertido.total).toBe(37.5);
  });

  it('devolve primitivos intactos', () => {
    expect(decimaisParaNumero('texto')).toBe('texto');
    expect(decimaisParaNumero(7)).toBe(7);
    expect(decimaisParaNumero(undefined)).toBeUndefined();
  });
});
