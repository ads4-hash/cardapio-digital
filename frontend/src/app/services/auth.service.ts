import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../environment';

export interface UsuarioLogado {
  id: string;
  nome: string;
  email: string;
  telefone?: string | null;
}

export interface AuthResponse {
  token: string;
  usuario: UsuarioLogado;
}

const CHAVE_TOKEN = 'auth_token';
const CHAVE_USUARIO = 'auth_usuario';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly AUTH_URL = `${environment.apiUrl}/auth`;

  private readonly token = signal<string | null>(this.carregarToken());

  private readonly usuario = signal<UsuarioLogado | null>(this.carregarUsuario());

  private restaurando = false;

  readonly isAutenticado = computed(() => this.token() !== null);

  getToken(): string | null {
    return this.token();
  }

  usuarioLogado(): UsuarioLogado | null {
    return this.usuario();
  }

  registrar(
    nome: string,
    email: string,
    senha: string,
    confirmarSenha: string,
    telefone?: string,
  ): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.AUTH_URL}/registrar`, {
      nome,
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
      error: () => {
        this.restaurando = false;
      },
    });
  }

  // Edita os dados do usuário logado (nome, e-mail e, opcionalmente, senha)
  atualizarPerfil(dados: {
    nome: string;
    email: string;
    telefone?: string | null;
    senha?: string;
    confirmarSenha?: string;
  }): Observable<UsuarioLogado> {
    return this.http.patch<UsuarioLogado>(`${this.AUTH_URL}/me`, dados);
  }

  // Mantém os dados locais em sincronia após a edição do perfil
  aplicarPerfil(usuario: UsuarioLogado): void {
    this.usuario.set(usuario);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
    }
  }

  salvarSessao(resposta: AuthResponse): void {
    this.token.set(resposta.token);
    this.usuario.set(resposta.usuario);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CHAVE_TOKEN, resposta.token);
      window.localStorage.setItem(CHAVE_USUARIO, JSON.stringify(resposta.usuario));
    }
  }

  logout(): void {
    this.token.set(null);
    this.usuario.set(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(CHAVE_TOKEN);
      window.localStorage.removeItem(CHAVE_USUARIO);
    }
  }

  private carregarToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(CHAVE_TOKEN);
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