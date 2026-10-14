// Espelha a política de senha do backend (`backend/src/common/senha.ts`): no
// mínimo 6 caracteres, com pelo menos uma letra e um número. Validar no
// frontend evita que o usuário só descubra a regra depois de enviar e receba um
// erro que poderia ter sido mostrado na hora.
export const SENHA_MENSAGEM =
  'A senha deve ter pelo menos 6 caracteres, com letras e números.';

// Espelha `SenhaForte` do backend: exige ao menos uma letra e um dígito.
const SENHA_FORTE = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export function senhaForteValida(senha: string): boolean {
  return senha.length >= 6 && SENHA_FORTE.test(senha);
}
