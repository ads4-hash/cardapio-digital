import { mensagemDoErro } from './mensagens-erro';

describe('mensagemDoErro', () => {
  it('lê o campo `mensagem` (formato padronizado do backend)', () => {
    const erro = { error: { mensagem: 'Código inválido ou expirado.' } };
    expect(mensagemDoErro(erro)).toBe('Código inválido ou expirado.');
  });

  it('usa o primeiro item quando `mensagem` é um array (validação de DTO)', () => {
    const erro = { error: { mensagem: ['Informe um e-mail válido.', 'outro'] } };
    expect(mensagemDoErro(erro)).toBe('Informe um e-mail válido.');
  });

  it('cai para `message` quando `mensagem` não existe', () => {
    const erro = { error: { message: 'E-mail já cadastrado.' } };
    expect(mensagemDoErro(erro)).toBe('E-mail já cadastrado.');
  });

  it('prefere `mensagem` a `message` quando ambos existem', () => {
    const erro = { error: { mensagem: 'pt-BR', message: 'fallback' } };
    expect(mensagemDoErro(erro)).toBe('pt-BR');
  });

  it('devolve null quando não há mensagem utilizável', () => {
    expect(mensagemDoErro(null)).toBeNull();
    expect(mensagemDoErro('texto')).toBeNull();
    expect(mensagemDoErro({})).toBeNull();
    expect(mensagemDoErro({ error: {} })).toBeNull();
    expect(mensagemDoErro({ error: { mensagem: '' } })).toBeNull();
    expect(mensagemDoErro({ error: { mensagem: [] } })).toBeNull();
  });
});
