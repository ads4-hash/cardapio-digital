// O AuthModule resolve o segredo do JWT no momento em que o módulo é definido
// (JwtModule.register({ secret: obterSegredo() })). Como `setupFiles` roda
// antes dos imports dos testes, definir as envs aqui evita o throw ao importar
// o AppModule — e dispensa um .env no CI.
process.env.JWT_SECRET = 'segredo-e2e-de-teste';
process.env.HASH_SECRET = 'hash-e2e-de-teste';
// Banco dos e2e (resetado no globalSetup). Caminho relativo a backend/prisma,
// como o Prisma resolve DATABASE_URL — igual ao dev.db, mas separado.
process.env.DATABASE_URL = 'file:./e2e.db';
// O .env da máquina pode ter SMTP configurado, e o Prisma client carrega o
// .env no connect (depois disto). Como o dotenv não sobrescreve chaves já
// presentes, fixar vazio garante o modo local (código de recuperação na
// resposta) em qualquer ambiente — inclusive no CI.
process.env.SMTP_HOST = '';
