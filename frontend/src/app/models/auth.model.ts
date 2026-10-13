// Contratos de autenticação vêm do pacote compartilhado @projetinho/contratos.
import type { UsuarioPublico } from '@projetinho/contratos';

export type {
  EstabelecimentoResumo as EstabelecimentoUsuario,
  UsuarioPublico as UsuarioLogado,
  RespostaAuth as AuthResponse,
  RecuperacaoResposta as RecuperacaoResponse,
} from '@projetinho/contratos';

export type UsuarioLogadoComTokens = UsuarioPublico & {
  token?: string;
  refreshToken?: string;
};
