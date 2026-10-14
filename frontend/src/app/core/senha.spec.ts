import { senhaForteValida } from './senha';

describe('senhaForteValida', () => {
  it('aceita senha com letras e números e 6+ caracteres', () => {
    expect(senhaForteValida('senha123')).toBe(true);
    expect(senhaForteValida('a1b2c3')).toBe(true);
  });

  it('recusa apenas letras ou apenas números', () => {
    expect(senhaForteValida('abcdef')).toBe(false);
    expect(senhaForteValida('123456')).toBe(false);
  });

  it('recusa senha com menos de 6 caracteres', () => {
    expect(senhaForteValida('ab1')).toBe(false);
  });
});
