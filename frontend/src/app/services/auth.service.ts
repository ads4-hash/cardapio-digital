import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, shareReplay, tap } from 'rxjs';

import { environment } from '../environment';

interface EstabelecimentoUsuario {
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

interface AuthResponse {
  token: string;
  refreshToken: string;
  usuario: UsuarioLogado;
}

type UsuarioLogadoComTokens = UsuarioLogado & {
  token?: string;
  refreshToken?: string;
};

interface RecuperacaoResponse {
  enviadoPorEmail: boolean;
  mensagem: string;
  token?: string;
  expiraEm?: string;
}

const CHAVE_TOKEN = 'auth_token';
const CHAVE_REFRESH = 'auth_refresh_token';
const CHAVE_USUARIO = 'auth_usuario';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly AUTH_URL = `${environment.apiUrl}/auth`;

  private readonly token = signal<string | null>(this.carregarToken());

  private readonly refreshToken = signal<string | null>(
    this.carregarRefreshToken(),
  );

  private readonly usuario = signal<UsuarioLogado | null>(this.carregarUsuario());

  private restaurando = false;

  // Renovação em andamento: evita disparar vários /auth/refresh em paralelo
  // quando várias requisições tomam 401 ao mesmo tempo (rotacionaria o token
  // várias vezes e invalidaria os refresh tokens umas das outras).
  private renovando$?: Observable<AuthResponse>;

  readonly isAutenticado = computed(() => this.token() !== null);

  getToken(): string | null {
    return this.token();
  }

  getRefreshToken(): string | null {
    return this.refreshToken();
  }

  usuarioLogado(): UsuarioLogado | null {
    return this.usuario();
  }

  // O nome do usuário passa a ser o nome do estabelecimento (não há campo separado)
  registrar(
    nomeEstabelecimento: string,
    email: string,
    senha: string,
    confirmarSenha: string,
    telefone?: string,
  ): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.AUTH_URL}/registrar`, {
      nomeEstabelecimento,
      nome: nomeEstabelecimento,
      email,
      senha,
      confirmarSenha,
      telefone,
    });
  }

  login(email: string, senha: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.AUTH_URL}/login`, {
      email,
      senha,
    });
  }

  // Fluxo de recuperação de senha
  solicitarRecuperacao(
    email: string,
  ): Observable<RecuperacaoResponse> {
    return this.http.post<RecuperacaoResponse>(
      `${this.AUTH_URL}/recuperar-senha`,
      { email },
    );
  }

  redefinirSenha(
    token: string,
    novaSenha: string,
    confirmarSenha: string,
  ): Observable<{ mensagem: string }> {
    return this.http.post<{ mensagem: string }>(
      `${this.AUTH_URL}/redefinir-senha`,
      { token, novaSenha, confirmarSenha },
    );
  }

  // Valida se o token ainda é válido
  verificarSessao(): Observable<UsuarioLogado> {
    return this.http.get<UsuarioLogado>(`${this.AUTH_URL}/me`);
  }

  // Recarrega os dados do usuário logado quando há token válido mas os dados
  // ainda não foram carregados (ex.: recarregar a página direto em /cardapio)
  restaurarSessao(): void {
    if (isPlatformServer(this.platformId)) return;
    if (!this.token() || this.usuario() || this.restaurando) return;
    this.restaurando = true;
    this.verificarSessao().subscribe({
      next: (usuario) => {
        this.aplicarPerfil(usuario);
        this.restaurando = false;
      },
      error: (erro) => {
        this.restaurando = false;
        // 401 = token expirado/inválido: limpa a sessão local para não deixar
        // um estado "meio logado" com um token morto (o interceptor já faria
        // logout na primeira chamada 401, mas isto evita a janela inconsistente
        // até lá). Outros erros (rede, 500) preservam o token para reavaliar.
        if (erro?.status === 401) {
          this.limparSessao();
        }
      },
    });
  }

  // Edita os dados do usuário logado (nome, e-mail e, opcionalmente, senha).
  // `senhaAtual` é exigida pelo backend quando o e-mail ou a senha mudam.
  atualizarPerfil(dados: {
    nome: string;
    email: string;
    telefone?: string | null;
    senha?: string;
    confirmarSenha?: string;
    senhaAtual?: string;
  }): Observable<UsuarioLogadoComTokens> {
    return this.http.patch<UsuarioLogadoComTokens>(
      `${this.AUTH_URL}/me`,
      dados,
    );
  }

  // Mantém os dados locais em sincronia após a edição do perfil. Quando a
  // credencial muda, a API devolve tokens novos (as sessões antigas foram
  // encerradas) e nós os guardamos para não deslogar este dispositivo.
  aplicarPerfil(usuario: UsuarioLogadoComTokens): void {
    const { token, refreshToken, ...perfil } = usuario;
    this.usuario.set(perfil);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CHAVE_USUARIO, JSON.stringify(perfil));
      if (token) {
        this.token.set(token);
        window.localStorage.setItem(CHAVE_TOKEN, token);
      }
      if (refreshToken) {
        this.refreshToken.set(refreshToken);
        window.localStorage.setItem(CHAVE_REFRESH, refreshToken);
      }
    }
  }

  salvarSessao(resposta: AuthResponse): void {
    this.token.set(resposta.token);
    this.refreshToken.set(resposta.refreshToken);
    this.usuario.set(resposta.usuario);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CHAVE_TOKEN, resposta.token);
      window.localStorage.setItem(CHAVE_REFRESH, resposta.refreshToken);
      window.localStorage.setItem(CHAVE_USUARIO, JSON.stringify(resposta.usuario));
    }
  }

  // Renova o access token com o refresh token (rotação). Compartilha uma única
  // requisição em andamento para chamadas concorrentes.
  renovarToken(): Observable<AuthResponse> {
    if (this.renovando$) {
      return this.renovando$;
    }
    const refreshToken = this.refreshToken();
    this.renovando$ = this.http
      .post<AuthResponse>(`${this.AUTH_URL}/refresh`, { refreshToken })
      .pipe(
        tap((resposta) => this.salvarSessao(resposta)),
        finalize(() => {
          this.renovando$ = undefined;
        }),
        shareReplay(1),
      );
    return this.renovando$;
  }

  // Encerra a sessão: revoga o refresh token no servidor (best-effort) e limpa
  // o estado local imediatamente.
  logout(): void {
    const refreshToken = this.refreshToken();
    if (refreshToken) {
      this.http
        .post(`${this.AUTH_URL}/logout`, { refreshToken })
        .subscribe({ error: () => undefined });
    }
    this.limparSessao();
  }

  // Limpa apenas o estado local (usado quando o servidor já considerou a sessão
  // inválida e não faz sentido chamar /logout).
  limparSessao(): void {
    this.token.set(null);
    this.refreshToken.set(null);
    this.usuario.set(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(CHAVE_TOKEN);
      window.localStorage.removeItem(CHAVE_REFRESH);
      window.localStorage.removeItem(CHAVE_USUARIO);
    }
  }

  private carregarToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(CHAVE_TOKEN);
  }

  private carregarRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(CHAVE_REFRESH);
  }

  private carregarUsuario(): UsuarioLogado | null {
    if (typeof window === 'undefined') return null;
    const bruto = window.localStorage.getItem(CHAVE_USUARIO);
    if (!bruto) return null;
    try {
      return JSON.parse(bruto) as UsuarioLogado;
    } catch {
      return null;
    }
  }
}