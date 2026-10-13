export interface EstabelecimentoUsuario {
  id: string;
  nome: string;
  slug: string;
  telefone?: string | null;
}

export interface UsuarioLogado {
  id: string;
  nome: string;
  email: string;
  estabelecimento?: EstabelecimentoUsuario;
  telefone?: string | null;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  usuario: UsuarioLogado;
}

export type UsuarioLogadoComTokens = UsuarioLogado & {
  token?: string;
  refreshToken?: string;
};

export interface RecuperacaoResponse {
  enviadoPorEmail: boolean;
  mensagem: string;
  token?: string;
  expiraEm?: string;
}
