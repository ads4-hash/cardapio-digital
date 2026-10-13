import type { EstabelecimentoResumo } from './comum';

/** Usuário logado, sem o hash da senha. */
export interface UsuarioPublico {
  id: string;
  nome: string;
  email: string;
  estabelecimento: EstabelecimentoResumo;
}

/** Resposta de `POST /auth/registrar`, `/auth/login` e `/auth/refresh`. */
export interface RespostaAuth {
  token: string;
  refreshToken: string;
  usuario: UsuarioPublico;
}

/** Resposta de `PATCH /auth/me`: perfil e, se a credencial mudou, tokens novos. */
export interface PerfilAtualizado extends UsuarioPublico {
  token?: string;
  refreshToken?: string;
}

/** Resposta de `GET /auth/cardapio` — nome e contato, para telas públicas. */
export interface InfoCardapio {
  nome: string;
  telefone: string | null;
}

/** Resposta de `POST /auth/recuperar-senha`. */
export interface RecuperacaoResposta {
  enviadoPorEmail: boolean;
  mensagem: string;
  token?: string;
  expiraEm?: string;
}
