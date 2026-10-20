import { describe, expect, it } from 'vitest';
import { linkWhatsApp, numeroWhatsApp } from './whatsapp';

describe('numeroWhatsApp', () => {
  it('adiciona o DDI 55 a telefones brasileiros com 10 dígitos', () => {
    expect(numeroWhatsApp('(11) 3456-7890')).toBe('551134567890');
  });

  it('adiciona o DDI 55 a celulares com 11 dígitos', () => {
    expect(numeroWhatsApp('(85) 99988-4433')).toBe('5585999884433');
  });

  it('mantém números que já têm DDI', () => {
    expect(numeroWhatsApp('5511999887766')).toBe('5511999887766');
  });

  it('devolve null sem telefone', () => {
    expect(numeroWhatsApp(null)).toBeNull();
    expect(numeroWhatsApp(undefined)).toBeNull();
    expect(numeroWhatsApp('')).toBeNull();
  });

  it('devolve null para números curtos demais', () => {
    expect(numeroWhatsApp('12345')).toBeNull();
  });
});

describe('linkWhatsApp', () => {
  it('monta o link wa.me com a mensagem codificada', () => {
    const link = linkWhatsApp('(11) 99999-9999', 'Olá! Pedido #ABC123.');
    expect(link).toBe(
      'https://wa.me/5511999999999?text=Ol%C3%A1!%20Pedido%20%23ABC123.',
    );
  });

  it('devolve null quando o telefone é inválido', () => {
    expect(linkWhatsApp('abc', 'Olá')).toBeNull();
    expect(linkWhatsApp(null, 'Olá')).toBeNull();
  });
});
