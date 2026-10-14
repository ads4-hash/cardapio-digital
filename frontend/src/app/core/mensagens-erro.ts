// Extrai a mensagem de erro devolvida pela API.
//
// O backend padroniza TODAS as respostas de erro no campo `mensagem` (string ou
// array, para validação de DTO) — ver `ErrosGlobaisFilter` no backend. Alguns
// payloads ainda podem trazer `message` (formato cru do class-validator), então
// aceitamos os dois nomes. Sem isso, o frontend leria `error.message` (sempre
// indefinido) e cairia no texto genérico em vez de mostrar o motivo real.
export function mensagemDoErro(erro: unknown): string | null {
  if (!erro || typeof erro !== 'object') return null;

  const corpo = (
    erro as {
      error?: { mensagem?: string | string[]; message?: string | string[] };
    }
  ).error;
  if (!corpo) return null;

  const valor = corpo.mensagem ?? corpo.message;
  if (Array.isArray(valor)) return valor[0] ?? null;
  return typeof valor === 'string' && valor ? valor : null;
}
