// Segredo que assina os access tokens (JWT). Não existe fallback "de
// desenvolvimento": faltar a env derruba a aplicação com erro claro — um
// segredo default conhecido no código valeria como doca aberta para forjar
// tokens (o antigo 'dev-change-this-secret' era exatamente isso).
export function obterSegredo(): string {
  const segredo = process.env.JWT_SECRET;
  if (segredo) {
    return segredo;
  }
  throw new Error(
    'JWT_SECRET não definido. Defina um valor longo e aleatório no .env (ex.: openssl rand -base64 48).',
  );
}

// Segredo usado SOMENTE para hashear dados sensíveis em repouso (IPs/e-mails
// das tentativas de login, códigos de recuperação e refresh tokens). Fica
// separado do JWT para que rotacionar o JWT_SECRET não invalide o histórico de
// lockout nem os hashes dos códigos pendentes. Sem HASH_SECRET, cai de volta
// no JWT_SECRET (mesmo comportamento antigo, sem introduzir env obrigatória).
export function obterSegredoHash(): string {
  return process.env.HASH_SECRET?.trim() || obterSegredo();
}
