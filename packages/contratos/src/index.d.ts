// Tipos compartilhados entre o backend (NestJS) e o frontend (Angular).
//
// Pacote SOMENTE de tipos: os arquivos são `.d.ts` e todo o consumo é feito com
// `import type` / `export type`. Não há código em runtime, então o pacote não
// precisa de build e nunca é resolvido no bundle.

export * from './comum';
export * from './produto';
export * from './pedido';
export * from './auth';
export * from './configuracao';
