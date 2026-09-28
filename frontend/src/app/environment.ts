const API_PADRAO = 'http://localhost:3000';

/**
 * Duas URLs porque o SSR e o navegador enxergam a API de lugares diferentes:
 *
 * - `apiUrl`: usada pelo servidor Node. Precisa ser alcançável de dentro do
 *   container, não do computador do visitante.
 * - `publicApiUrl`: endereço que o navegador do visitante consegue abrir. Também
 *   aparece no HTML que o SSR entrega pronto, no `src` das `<img>` gerado por
 *   `resolverImagemUrl` e na URL do WebSocket.
 *
 * Sem essa separação, o container do frontend acabaria emitindo
 * `src="http://backend:3000/..."`, um hostname que só existe na rede interna do
 * Docker.
 *
 * A configuração chega ao navegador por `/config.js` (publicado por
 * `src/server.ts` e carregado no `<head>` de `index.html`), e não por
 * `process.env`: o bundle do cliente é código de browser, roda em uma máquina
 * que não tem as variáveis do container, então ler o ambiente direto ali
 * resolvia sempre para o padrão `localhost:3000` e ignorava `PUBLIC_API_URL`.
 * Sendo gerado por requisição, trocar a URL no `docker-compose` vale sem rebuild.
 */

/** Objeto publicado por `/config.js` */
interface ConfigInjetada {
  apiUrl?: string;
}

/** Leitura no bundle do browser: o objeto publicado por `/config.js` */
function lerConfigInjetada(): string | undefined {
  const escopo = (
    globalThis as {
      __PROJETINHO_CONFIG__?: ConfigInjetada;
    }
  ).__PROJETINHO_CONFIG__;
  return escopo?.apiUrl;
}

/**
 * Leitura no servidor Node sem quebrar o bundle do browser, onde `process` não
 * existe. Passa por `globalThis` (em vez de usar `process` direto) para não
 * exigir `@types/node` nos tsconfigs da aplicação — o código do browser não deve
 * depender de tipos do Node.
 */
function lerVariavel(nome: string): string | undefined {
  const processo = (
    globalThis as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process;
  return processo?.env?.[nome];
}

const noServidor = typeof window === 'undefined';

export const environment = {
  get apiUrl(): string {
    if (!noServidor) return lerConfigInjetada() ?? API_PADRAO;
    return lerVariavel('API_URL') ?? API_PADRAO;
  },
  get publicApiUrl(): string {
    if (!noServidor) return lerConfigInjetada() ?? API_PADRAO;
    return lerVariavel('PUBLIC_API_URL') ?? API_PADRAO;
  },
};
