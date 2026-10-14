import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, shareReplay, tap } from 'rxjs';

import { environment } from '../environment';
import type {
  AuthResponse,
  RecuperacaoResponse,
  UsuarioLogado,
  UsuarioLogadoComTokens,
} from '../models/auth.model';

// Só o perfil fica no localStorage (dados públicos, não sensíveis) para a UI
// nascer com o nome do usuário. Os tokens saem de lá: o access token fica em
// memória (some ao recarregar) e o refresh token vive em um cookie HttpOnly,
// inacessível ao JavaScript — um XSS não consegue roubar a sessão.
const CHAVE_USUARIO = 'auth_usuario';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly AUTH_URL = `${environment.apiUrl}/auth`;

  private readonly token = signal<string | null>(null);

  private readonly usuario = signal<UsuarioLogado | null>(
    this.carregarUsuario(),
  );

  private renovando$?: Observable<AuthResponse>;

  constructor() {
    // Migração: versões antigas guardavam os tokens no localStorage. Se um
    // navegador ainda tiver os valores, remove-os — o refresh agora é um cookie
    // HttpOnly e o access fica só em memória.
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('auth_token');
      window.localStorage.removeItem('auth_refresh_token');
    }
  }

  // A sessão é considerada ativa enquanto houver um perfil conhecido; a
  // validade real é confirmada pelo servidor (o token é renovado no primeiro
  // 401 ou na abertura do painel).
  readonly isAutenticado = computed(() => this.usuario() !== null);

  getToken(): string | null {
    return this.token();
  }

  usuarioLogado(): UsuarioLogado | null {
    return this.usuario();
  }

  // Há uma sessão anterior que talvez dê para renovar pelo cookie do refresh.
  podeRenovar(): boolean {
    return this.usuario() !== null;
  }

  // O nome do usuário passa a ser o nome do estabelecimento (não há campo separado)
  registrar(
    nomeEstabelecimento: string,
    email: string,
    senha: string,
    confirmarSenha: string,
    telefone?: string,
  ): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.AUTH_URL}/registrar`,
      {
        nomeEstabelecimento,
        nome: nomeEstabelecimento,
        email,
        senha,
        confirmarSenha,
        telefone,
      },
      { withCredentials: true },
    );
  }

  login(email: string, senha: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.AUTH_URL}/login`,
      { email, senha },
      { withCredentials: true },
    );
  }

  // Fluxo de recuperação de senha
  solicitarRecuperacao(email: string): Observable<RecuperacaoResponse> {
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

  // Valida se a sessão ainda é válida
  verificarSessao(): Observable<UsuarioLogado> {
    return this.http.get<UsuarioLogado>(`${this.AUTH_URL}/me`);
  }

  // Ao abrir o painel: se há uma sessão anterior (perfil salvo) e ainda não
  // temos o access token em memória (recarregou a página), renova pelo cookie
  // HttpOnly. Sem isto, o usuário apareceria logado mas sem token para chamar a API.
  restaurarSessao(): void {
    if (isPlatformServer(this.platformId)) return;
    if (this.token() || !this.usuario()) return;
    this.renovarToken().subscribe({ error: () => this.limparSessao() });
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
  // credencial muda, a API devolve um access token novo (as sessões antigas
  // foram encerradas) e grava o refresh novo no cookie; aqui só guardamos o
  // novo access token em memória.
  aplicarPerfil(usuario: UsuarioLogadoComTokens): void {
    const { token, ...perfil } = usuario;
    this.usuario.set(perfil);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CHAVE_USUARIO, JSON.stringify(perfil));
      if (token) {
        this.token.set(token);
      }
    }
  }

  salvarSessao(resposta: AuthResponse): void {
    this.token.set(resposta.token);
    this.usuario.set(resposta.usuario);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        CHAVE_USUARIO,
        JSON.stringify(resposta.usuario),
      );
    }
  }

  // Renova o access token usando o cookie HttpOnly (sem corpo). Compartilha uma
  // única requisição em andamento para chamadas concorrentes.
  renovarToken(): Observable<AuthResponse> {
    if (this.renovando$) {
      return this.renovando$;
    }
    this.renovando$ = this.http
      .post<AuthResponse>(`${this.AUTH_URL}/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((resposta) => this.salvarSessao(resposta)),
        finalize(() => {
          this.renovando$ = undefined;
        }),
        shareReplay(1),
      );
    return this.renovando$;
  }

  // Encerra a sessão: revoga o refresh token no servidor (best-effort, via
  // cookie) e limpa o estado local imediatamente.
  logout(): void {
    this.http
      .post(`${this.AUTH_URL}/logout`, {}, { withCredentials: true })
      .subscribe({ error: () => undefined });
    this.limparSessao();
  }

  // Limpa apenas o estado local (usado quando o servidor já considerou a sessão
  // inválida e não faz sentido chamar /logout).
  limparSessao(): void {
    this.token.set(null);
    this.usuario.set(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(CHAVE_USUARIO);
    }
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
