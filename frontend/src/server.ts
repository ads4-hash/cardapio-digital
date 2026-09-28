import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

/**
 * O Angular valida o header `Host` contra uma lista de hosts para evitar SSRF,
 * e o padrão do `angular.json` é uma lista vazia — ou seja, "nenhum host
 * permitido" e toda requisição responde 400. O domínio é uma decisão de
 * deploy, então a lista vem do ambiente em vez de ficar fixa no build.
 *
 * Use `*` apenas se um proxy/load balancer na frente já validar o `Host`; o
 * Angular avisa que isso é um risco de segurança.
 */
const HOSTS_PERMITIDOS = (
  process.env['ALLOWED_HOSTS'] ?? 'localhost,127.0.0.1'
)
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

/**
 * URL que o NAVEGADOR do visitante usa para a API (chamadas XHR, WebSocket e o
 * `src` das imagens do HTML pré-renderizado).
 *
 * O bundle do cliente não tem acesso a `process.env` — é código de browser e
 * roda em uma máquina que não conhece as variáveis do container. Publicar a URL
 * em `/config.js` é o que faz `PUBLIC_API_URL` valer no cliente: o `index.html`
 * carrega esse script no `<head>`, antes dos bundles, e o `environment.ts` lê o
 * objeto daqui. Gerado por requisição, trocar a variável no `docker-compose`
 * não exige rebuild.
 */
const API_PUBLICA = (
  process.env['PUBLIC_API_URL'] ?? 'http://localhost:3000'
).replace(/\/+$/, '');

const app = express();
const angularApp = new AngularNodeAppEngine({
  allowedHosts: HOSTS_PERMITIDOS,
});

/**
 * Publica a configuração da API para o bundle do browser.
 *
 * Fica antes do `express.static` e do app engine de propósito: assim vence de
 * qualquer arquivo homônimo em `dist` e responde em toda rota, inclusive nas
 * páginas pré-renderizadas. Sem cache, para não servir uma URL velha depois de
 * a variável mudar no deploy.
 */
app.get('/config.js', (_req, res) => {
  res.type('application/javascript');
  res.set('Cache-Control', 'no-store');
  res.send(
    `globalThis.__PROJETINHO_CONFIG__=${JSON.stringify({ apiUrl: API_PUBLICA })};`,
  );
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
    console.log(`Hosts permitidos no SSR: ${HOSTS_PERMITIDOS.join(', ')}`);
    console.log(`URL da API para o navegador: ${API_PUBLICA}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
