#!/usr/bin/env node

const nodeVersion = process.versions.node;
const [major] = nodeVersion.split('.').map(Number);
const requiredMajor = 22;

if (major < requiredMajor) {
  console.error(
    `\n[ERRO] Versão do Node.js incompatível.\n` +
      `Você está usando Node.js v${nodeVersion}. É necessário Node.js >= ${requiredMajor}.0.0.\n` +
      `Consulte .nvmrc ou atualize sua instalação.\n`,
  );
  process.exit(1);
}

console.log(`[check-node] Node.js v${nodeVersion} OK`);
