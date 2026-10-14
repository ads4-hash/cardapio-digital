// O AuthModule resolve o segredo do JWT no momento em que o módulo é definido
// (JwtModule.register({ secret: obterSegredo() })). Como `setupFiles` roda
// antes dos imports dos testes, definir as envs aqui evita o throw ao importar
// o AppModule — e dispensa um .env no CI.
process.env.JWT_SECRET = 'segredo-e2e-de-teste';
process.env.HASH_SECRET = 'hash-e2e-de-teste';
