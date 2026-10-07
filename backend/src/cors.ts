// 4200 = `ng serve` em desenvolvimento; 4000 = servidor SSR empacotado pelo Docker
const ORIGENS_CORS_PADRAO = ['http://localhost:4200', 'http://localhost:4000'];

// Origens permitidas (separadas por vírgula em CORS_ORIGIN). Um único ponto de
// verdade para o REST (main.ts) e o handshake do Socket.IO (pedidos.gateway.ts):
// divergir os dois faria o painel funcionar no HTTP e "sumir" no tempo real.
export function origensCors(): string[] {
  return (
    process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) ??
    ORIGENS_CORS_PADRAO
  );
}
