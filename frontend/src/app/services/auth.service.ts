import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../environment';

export interface UsuarioLogado {
  id: string;
  nome: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  usuario: UsuarioLogado;
}

const CHAVE_TOKEN = 'auth_token';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly AUTH_URL = `${environment.apiUrl}/auth`;

  private readonly token = signal<string | null>(this.carregarToken());

  private readonly usuario = signal<UsuarioLogado | null>(null);

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
  ): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.AUTH_URL}/registrar`, {
      nome,
      email,
      senha,
      confirmarSenha,
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

  // Edita os dados do usuário logado (mesmos campos do cadastro)
  atualizarPerfil(dados: {
    nome: string;
    email: string;
    senha: string;
    confirmarSenha: string;
  }): Observable<UsuarioLogado> {
    return this.http.patch<UsuarioLogado>(`${this.AUTH_URL}/me`, dados);
  }

  // Mantém os dados locais em sincronia após a edição do perfil
  aplicarPerfil(usuario: UsuarioLogado): void {
    this.usuario.set(usuario);
  }

  salvarSessao(resposta: AuthResponse): void {
    this.token.set(resposta.token);
    this.usuario.set(resposta.usuario);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CHAVE_TOKEN, resposta.token);
    }
  }

  logout(): void {
    this.token.set(null);
    this.usuario.set(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(CHAVE_TOKEN);
    }
  }

  private carregarToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(CHAVE_TOKEN);
  }
}