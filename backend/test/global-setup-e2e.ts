import { execSync } from 'child_process';
import { join } from 'path';

// Banco dedicado dos e2e, resetado a cada execução: os specs criam
// estabelecimentos, usuários e pedidos de verdade (Prisma e JWT reais), então
// cada run precisa partir do schema limpo. O caminho é relativo a
// backend/prisma — é assim que o Prisma resolve `file:` em DATABASE_URL
// (relativo ao schema, não ao cwd do processo).
export const DATABASE_URL_E2E = 'file:./e2e.db';

export default function globalSetup(): void {
  const schema = join(__dirname, '..', 'prisma', 'schema.prisma');
  execSync(
    `npx prisma db push --force-reset --skip-generate --schema "${schema}"`,
    {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: DATABASE_URL_E2E },
    },
  );
}
