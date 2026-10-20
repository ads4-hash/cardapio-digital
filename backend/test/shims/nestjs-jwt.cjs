// @nestjs/jwt@12 é ESM-only ("type": "module") e o Jest (CJS + ts-jest) não
// transforma node_modules: carregar o módulo real derruba o require. É por
// isso que os testes unitários mockam `@nestjs/jwt` com stubs — e também por
// que, até aqui, nenhum e2e conseguia exercitar JWT de verdade.
//
// Este shim expõe a superfície usada pelo código (register/sign/verifyAsync/
// decode) por cima do `jsonwebtoken` (CJS, a própria dependência do
// @nestjs/jwt), permitindo e2e com tokens reais. Mapeado em jest-e2e.json via
// moduleNameMapper.
'use strict';

const jwt = require('jsonwebtoken');
const { Module } = require('@nestjs/common');

class JwtService {
  constructor(opcoes = {}) {
    this.opcoesModulo = opcoes;
  }

  sign(payload, opcoes = {}) {
    return jwt.sign(payload, this.segredo(), this.mesclar(opcoes));
  }

  async verifyAsync(token, opcoes = {}) {
    return jwt.verify(token, this.segredo(), this.mesclar(opcoes));
  }

  decode(token) {
    return jwt.decode(token);
  }

  segredo() {
    const segredo = this.opcoesModulo.secret ?? process.env.JWT_SECRET;
    if (!segredo) {
      throw new Error('Segredo do JWT ausente (defina JWT_SECRET nos testes).');
    }
    return segredo;
  }

  // Reproduz a precedência do @nestjs/jwt: as opções da chamada vencem as do
  // módulo, e `signOptions` do registro é achatado (o jsonwebtoken espera
  // `expiresIn` no topo, não aninhado sob `signOptions`).
  mesclar(opcoes) {
    const { secret, global: _ignorado, signOptions, ...restoModulo } =
      this.opcoesModulo;
    return { ...(signOptions ?? {}), ...restoModulo, ...opcoes };
  }
}

class JwtModule {}
Module({})(JwtModule);

JwtModule.register = (opcoes = {}) => ({
  module: JwtModule,
  global: opcoes.global === true,
  providers: [{ provide: JwtService, useValue: new JwtService(opcoes) }],
  exports: [JwtService],
});

module.exports = { JwtService, JwtModule };
