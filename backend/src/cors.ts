// 4200 = `ng serve` em desenvolvimento; 4000 = servidor SSR empacotado pelo Docker.
// As variantes 127.0.0.1 entram porque o navegador pode resolver `localhost`
// para o IPv4 e mandar `Origin: http://127.0.0.1:4200`, que não casaria com a
// lista só de `localhost` — o CORS recusaria e o fetch viraria "Failed to fetch".
const ORIGENS_CORS_PADRAO = [
  'http://localhost:4200',
  'http://localhost:4000',
  'http://127.0.0.1:4200',
  'http://127.0.0.1:4000',
];

// Origens permitidas (separadas por vírgula em CORS_ORIGIN). Um único ponto de
// verdade para o REST (main.ts) e o handshake do Socket.IO (pedidos.gateway.ts):
// divergir os dois faria o painel funcionar no HTTP e "sumir" no tempo real.
export function origensCors(): string[] {
  // `filter(Boolean)` descarta entradas vazias (vírgula sobrando, CORS_ORIGIN=""),
  // que senão virariam uma origem fantasma e uma lista não-vazia que não casa
  // com nada — preferimos cair no padrão a subir com CORS quebrado.
  const configuradas = process.env.CORS_ORIGIN?.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return configuradas && configuradas.length > 0
    ? configuradas
    : ORIGENS_CORS_PADRAO;
}
