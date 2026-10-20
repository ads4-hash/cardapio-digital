import { obterSegredo } from '../auth/segredo';
import { origensCors } from '../cors';

// Validação de ambiente no boot (fail-fast).
//
// Quase toda configuração chega por variável de ambiente e quase nenhuma é
// conferida na partida: um `CORS_ORIGIN` com a origem errada, uma `PORT` não
// numérica ou um `COOKIE_SAMESITE=none` sem `secure` só aparecem em runtime —
// normalmente no navegador do usuário, como um erro de rede opaco ("Failed to
// fetch") em vez de uma mensagem que aponte a variável culpada. Validar aqui,
// antes de subir o servidor, troca esse diagnóstico tardio por um erro claro no
// log de inicialização, e o resumo impresso documenta o que o processo de fato
// entendeu do ambiente (fim da dúvida "será que a env foi lida?").

const SAMESITE_VALIDOS = ['lax', 'strict', 'none'] as const;
const FORMATOS_LOG_VALIDOS = ['json', 'pretty'] as const;

export type SameSiteCookie = (typeof SAMESITE_VALIDOS)[number];
export type FormatoLog = (typeof FORMATOS_LOG_VALIDOS)[number];

/** O que o processo entendeu do ambiente, já validado e pronto para logar. */
export interface ResumoAmbiente {
  porta: number;
  emProducao: boolean;
  origensCors: string[];
  cookieSameSite: SameSiteCookie;
  cookieSecure: boolean;
  confiarProxy: boolean;
  formatoLog: FormatoLog;
}

// Aceita só "true"/"false" (vazio conta como ausente). Um valor como "1" ou
// "yes" parece funcionar em alguns lugares e falhar em outros: o backend lê
// esses booleanos com comparacão exata a "true" em vários pontos, então é
// melhor recusar na partida do que ligar pela metade.
function validarBooleano(nome: string, valor: string | undefined): void {
  const normalizado = valor?.trim().toLowerCase();
  if (normalizado === undefined || normalizado === '') return;
  if (normalizado !== 'true' && normalizado !== 'false') {
    throw new Error(
      `Variável ${nome} inválida ("${valor}"): use "true" ou "false".`,
    );
  }
}

function validarPorta(valor: string | undefined, padrao: number): number {
  if (valor === undefined || valor.trim() === '') return padrao;
  const porta = Number(valor);
  if (!Number.isInteger(porta) || porta < 1 || porta > 65535) {
    throw new Error(
      `Variável PORT inválida ("${valor}"): use um inteiro entre 1 e 65535.`,
    );
  }
  return porta;
}

// Cada origem precisa ser uma URL http(s) completa. Sem esta checagem um valor
// como "localhost:4200" (sem esquema) ou "meusite.com" passa batido e o CORS
// simplesmente não casa com o `Origin` que o navegador envia — de novo, a falha
// só aparece como erro de rede no cliente.
function validarOrigens(origens: string[]): void {
  for (const origem of origens) {
    // `credentials: true` proíbe `Access-Control-Allow-Origin: *` (o navegador
    // descarta a resposta), então "*" nunca é uma origem válida aqui.
    if (origem === '*') {
      throw new Error(
        'CORS_ORIGIN não pode ser "*": a API usa cookies (credentials), e o navegador rejeita `Access-Control-Allow-Origin: *` nesse caso. Liste as origens exatas.',
      );
    }

    let url: URL;
    try {
      url = new URL(origem);
    } catch {
      throw new Error(
        `Origem inválida em CORS_ORIGIN ("${origem}"): use URLs completas, como http://localhost:4200.`,
      );
    }

    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || !url.host) {
      throw new Error(
        `Origem inválida em CORS_ORIGIN ("${origem}"): use URLs completas, como http://localhost:4200.`,
      );
    }
  }
}

/**
 * Valida o ambiente e devolve um resumo para log. Lança na primeira
 * inconsistência, derrubando a aplicação com uma mensagem que aponta a
 * variável — de propósito: um ambiente mal configurado não deve subir.
 */
export function validarAmbiente(): ResumoAmbiente {
  // Reaproveita a checagem canônica do segredo (mensagem já conhecida).
  obterSegredo();

  validarBooleano('CONFIAR_PROXY', process.env.CONFIAR_PROXY);
  validarBooleano('COOKIE_SECURE', process.env.COOKIE_SECURE);
  validarBooleano('DOCS_HABILITADOS', process.env.DOCS_HABILITADOS);

  const emProducao = process.env.NODE_ENV === 'production';

  // Formato dos logs: JSON em produção (colheita por agregador), texto legível
  // em desenvolvimento. Um valor fora de json/pretty é erro de configuração —
  // mesmo racional do resto do fail-fast: derrubar o boot apontando a variável
  // é melhor que logar em silêncio no formato errado.
  const logBruto = process.env.LOG_FORMAT?.trim().toLowerCase() || '';
  if (
    logBruto !== '' &&
    !(FORMATOS_LOG_VALIDOS as readonly string[]).includes(logBruto)
  ) {
    throw new Error(
      `LOG_FORMAT inválido ("${process.env.LOG_FORMAT}"): use "json" ou "pretty".`,
    );
  }
  const formatoLog = (logBruto ||
    (emProducao ? 'json' : 'pretty')) as FormatoLog;

  const mesmaSiteBruto =
    process.env.COOKIE_SAMESITE?.trim().toLowerCase() || 'lax';
  if (!(SAMESITE_VALIDOS as readonly string[]).includes(mesmaSiteBruto)) {
    throw new Error(
      `COOKIE_SAMESITE inválido ("${process.env.COOKIE_SAMESITE}"): use "lax", "strict" ou "none".`,
    );
  }
  const cookieSameSite = mesmaSiteBruto as SameSiteCookie;

  // Mesma lógica do cookie-refresh: sem COOKIE_SECURE explícito, liga em produção.
  const cookieSecure = process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE.trim().toLowerCase() === 'true'
    : emProducao;

  // SameSite=None só é aceito pelo navegador junto de Secure; sem isso o cookie
  // é descartado e o refresh falha silenciosamente (o login "funciona", mas a
  // sessão nunca renova).
  if (cookieSameSite === 'none' && !cookieSecure) {
    throw new Error(
      'COOKIE_SAMESITE=none exige COOKIE_SECURE=true (ou NODE_ENV=production): sem Secure o navegador descarta o cookie e a sessão nunca renova.',
    );
  }

  const portas = validarPorta(process.env.PORT, 3000);

  const origens = origensCors();
  validarOrigens(origens);

  return {
    porta: portas,
    emProducao,
    origensCors: origens,
    cookieSameSite,
    cookieSecure,
    confiarProxy: process.env.CONFIAR_PROXY?.trim().toLowerCase() === 'true',
    formatoLog,
  };
}
