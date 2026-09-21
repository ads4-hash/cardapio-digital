// Segredo usado para assinar os JWTs e hashear IPs/e-mails das tentativas de login.
// Em produção a env JWT_SECRET é obrigatória (sem fallback que possa ser explorado).
export function obterSegredo(): string {
  const segredo = process.env.JWT_SECRET;
  if (segredo) {
    return segredo;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET não definido no ambiente de produção.');
  }
  return 'dev-change-this-secret';
}
