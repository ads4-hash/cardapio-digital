import { Prisma } from '@prisma/client';
import { deCentavos, paraCentavos } from './dinheiro';

describe('dinheiro', () => {
  describe('paraCentavos', () => {
    it('converte number com 2 casas em centavos inteiros', () => {
      expect(paraCentavos(28.9)).toBe(2890);
      expect(paraCentavos(4.5)).toBe(450);
      expect(paraCentavos(10)).toBe(1000);
    });

    it('neutraliza o ruído binário de valores em ponto flutuante', () => {
      // 0.1 + 0.2 = 0.30000000000000004 em ponto flutuante; 0.29 * 100 =
      // 28.999999999999996. Sem o arredondamento, os dois vazariam para o banco.
      expect(paraCentavos(0.1 + 0.2)).toBe(30);
      expect(paraCentavos(0.29)).toBe(29);
    });

    it('aceita string e Prisma.Decimal (valores vindos do banco)', () => {
      expect(paraCentavos('25.90')).toBe(2590);
      expect(paraCentavos(new Prisma.Decimal('19.99'))).toBe(1999);
    });

    it('devolve 0 para valores não finitos', () => {
      expect(paraCentavos(Number.NaN)).toBe(0);
      expect(paraCentavos(Number.POSITIVE_INFINITY)).toBe(0);
    });
  });

  describe('deCentavos', () => {
    it('volta de centavos para o number com 2 casas', () => {
      expect(deCentavos(2890)).toBe(28.9);
      expect(deCentavos(2750)).toBe(27.5);
      expect(deCentavos(2550)).toBe(25.5);
    });

    it('faz o caminho de ida e volta sem perda', () => {
      for (const valor of [0.01, 1.1, 12.34, 99.99, 1234.56]) {
        expect(deCentavos(paraCentavos(valor))).toBe(valor);
      }
    });
  });
});
