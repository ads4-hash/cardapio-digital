// Formata a digitação de um preço em reais para exibição (sem o "R$").
// Interpreta os dígitos da direita (os últimos 2 são os centavos).
export function formatarEntradaPreco(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 10);
  if (!digitos) return '';
  const pad = digitos.padStart(3, '0');
  let reais = pad.slice(0, -2).replace(/^0+(?=\d)/, '');
  const centavos = pad.slice(-2);
  if (reais === '0' && digitos.length <= 2) reais = '';
  const reaisGrupos = reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${reaisGrupos},${centavos}`;
}

// Converte um texto formatado ("1.234,56") de volta para número.
export function precoFormatadoParaNumero(valor: string): number {
  return Number(valor.replace(/\./g, '').replace(',', '.'));
}
