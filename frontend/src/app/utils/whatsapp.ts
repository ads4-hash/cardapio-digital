// Helpers de link do WhatsApp (wa.me) usados pelo cardápio público, pelo
// acompanhamento de pedido e pelo envio do resumo do pedido ao estabelecimento.
// A normalização vive aqui para não ficar duplicada em três componentes.

// Normaliza um telefone brasileiro para o formato wa.me (55 + dígitos).
// Números com 10 ou 11 dígitos ganham o DDI 55 automaticamente; os demais
// são mantidos como vieram, desde que tenham tamanho plausível.
export function numeroWhatsApp(
  telefone: string | null | undefined,
): string | null {
  if (!telefone) return null;
  const digitos = telefone.replace(/\D/g, '');
  const numero =
    digitos.length === 10 || digitos.length === 11 ? `55${digitos}` : digitos;
  if (numero.length < 10 || numero.length > 13) return null;
  return numero;
}

// Monta o link wa.me com a mensagem já codificada. Retorna null quando o
// telefone é ausente/inválido — o chamador esconde o botão nesse caso.
export function linkWhatsApp(
  telefone: string | null | undefined,
  mensagem: string,
): string | null {
  const numero = numeroWhatsApp(telefone);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}
