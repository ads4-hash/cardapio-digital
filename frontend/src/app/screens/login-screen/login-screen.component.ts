import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

type Modo = 'login' | 'cadastro';

@Component({
  selector: 'app-login-screen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">
      <div class="login-card">
        <h1>{{ modo() === 'login' ? 'Acesso restrito' : 'Criar conta' }}</h1>

        <div class="segmented" role="tablist" aria-label="Entrar ou criar conta">
          <button
            type="button"
            role="tab"
            [class.active]="modo() === 'login'"
            (click)="alternarModo('login')"
          >Entrar</button>
          <button
            type="button"
            role="tab"
            [class.active]="modo() === 'cadastro'"
            (click)="alternarModo('cadastro')"
          >Criar conta</button>
        </div>

        @if (erro()) {
          <p class="erro">{{ erro() }}</p>
        }

        <form (ngSubmit)="enviar()" autocomplete="on">
          @if (modo() === 'cadastro') {
            <label for="nome">Nome de usuário</label>
            <input
              id="nome"
              name="nome"
              type="text"
              autocomplete="username"
              [(ngModel)]="nome"
              placeholder="Como você quer ser chamado"
              required
            />
          }

          <label for="email">E-mail</label>
          <input
            id="email"
            name="email"
            type="email"
            autocomplete="email"
            [(ngModel)]="email"
            placeholder="voce@exemplo.com"
            required
          />

          <label for="senha">Senha</label>
          <div class="senha-wrap">
            <input
              id="senha"
              name="senha"
              [type]="mostrarSenha() ? 'text' : 'password'"
              [attr.autocomplete]="modo() === 'cadastro' ? 'new-password' : 'current-password'"
              [(ngModel)]="senha"
              placeholder="Sua senha"
              minlength="6"
              required
            />
            <button
              type="button"
              class="toggle-senha"
              (click)="mostrarSenha.set(!mostrarSenha())"
              [attr.aria-label]="mostrarSenha() ? 'Ocultar senha' : 'Mostrar senha'"
            >
              {{ mostrarSenha() ? '🙈' : '👁️' }}
            </button>
          </div>

          @if (modo() === 'cadastro') {
            <label for="confirmarSenha">Confirmar senha</label>
            <input
              id="confirmarSenha"
              name="confirmarSenha"
              [type]="mostrarSenha() ? 'text' : 'password'"
              autocomplete="new-password"
              [(ngModel)]="confirmarSenha"
              placeholder="Digite a senha novamente"
              minlength="6"
              required
            />
          }

          <button
            type="submit"
            class="btn-primary"
            [disabled]="enviando()"
          >
            {{ enviando() ? (modo() === 'cadastro' ? 'Criando conta...' : 'Entrando...') : (modo() === 'cadastro' ? 'Criar conta' : 'Entrar') }}
          </button>
        </form>

        @if (modo() === 'cadastro') {
          <p class="ajuda">A senha precisa ter pelo menos 6 caracteres. Você entrará com o e-mail e a senha cadastrados.</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: calc(100vh - 70px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
    }
    .login-card {
      width: 100%;
      max-width: 400px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 20px;
      box-shadow: var(--shadow-lg);
      padding: 36px 32px;
      animation: fade-up var(--transition-slow);
    }
    @keyframes fade-up {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .brand-mark {
      width: 46px;
      height: 46px;
      border-radius: 14px;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      box-shadow: 0 8px 20px color-mix(in srgb, var(--primary) 35%, transparent);
      margin-bottom: 18px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 1.45rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .subtitle {
      margin: 0 0 20px;
      color: var(--text-muted);
      font-size: 0.92rem;
      line-height: 1.5;
    }
    .segmented {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
      background: var(--surface-muted);
      border: 1px solid var(--border);
      padding: 4px;
      border-radius: 12px;
      margin-bottom: 20px;
    }
    .segmented button {
      padding: 9px 12px;
      border: none;
      border-radius: 9px;
      background: transparent;
      color: var(--text-muted);
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;
      transition: background var(--transition), color var(--transition), box-shadow var(--transition);
    }
    .segmented button.active {
      background: var(--card);
      color: var(--primary);
      box-shadow: var(--shadow-sm);
    }
    .erro {
      background: var(--danger-light);
      color: var(--danger);
      padding: 12px 14px;
      border-radius: 10px;
      font-size: 0.88rem;
      font-weight: 500;
      margin: 0 0 16px;
    }
    form { display: flex; flex-direction: column; gap: 14px; }
    label {
      font-weight: 600;
      font-size: 0.88rem;
      color: var(--text);
      margin-bottom: -8px;
    }
    input {
      width: 100%;
      padding: 13px 14px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--card);
      color: var(--text);
      font-size: 0.95rem;
      box-sizing: border-box;
      outline: none;
      transition: border-color var(--transition), box-shadow var(--transition);
    }
    input:focus { border-color: var(--primary); box-shadow: 0 0 0 4px var(--primary-light); }
    input::placeholder { color: var(--text-muted); opacity: 0.7; }
    .senha-wrap { position: relative; }
    .senha-wrap input { padding-right: 46px; }
    .toggle-senha {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      border: none;
      background: transparent;
      cursor: pointer;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      transition: background var(--transition);
    }
    .toggle-senha:hover { background: var(--surface-hover); }
    .btn-primary {
      margin-top: 6px;
      padding: 14px;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: #fff;
      border: none;
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 30%, transparent);
      transition: filter var(--transition), transform var(--transition), box-shadow var(--transition);
    }
    .btn-primary:hover:not(:disabled) { filter: brightness(1.05); box-shadow: 0 6px 16px color-mix(in srgb, var(--primary) 40%, transparent); }
    .btn-primary:active:not(:disabled) { transform: scale(0.99); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .ajuda { margin: 16px 0 0; font-size: 0.8rem; color: var(--text-muted); text-align: center; }
  `],
})
export class LoginScreenComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  nome = '';
  email = '';
  senha = '';
  confirmarSenha = '';
  modo = signal<Modo>('login');
  mostrarSenha = signal(false);
  enviando = signal(false);
  erro = signal<string | null>(null);

  alternarModo(novoModo: Modo): void {
    if (this.modo() === novoModo) return;
    this.modo.set(novoModo);
    this.erro.set(null);
  }

  enviar(): void {
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());

    if (!emailValido) {
      this.erro.set('Informe um e-mail válido.');
      return;
    }
    if (!this.senha) {
      this.erro.set('Informe a senha.');
      return;
    }
    if (this.senha.length < 6) {
      this.erro.set('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    if (this.modo() === 'cadastro') {
      if (!this.nome.trim()) {
        this.erro.set('Informe um nome de usuário.');
        return;
      }
      if (this.senha !== this.confirmarSenha) {
        this.erro.set('As senhas não conferem.');
        return;
      }
    }

    this.enviando.set(true);
    this.erro.set(null);

    const chamada =
      this.modo() === 'cadastro'
        ? this.authService.registrar(
            this.nome.trim(),
            this.email.trim(),
            this.senha,
            this.confirmarSenha,
          )
        : this.authService.login(this.email.trim(), this.senha);

    chamada.subscribe({
      next: (resposta) => {
        this.authService.salvarSessao(resposta);
        this.enviando.set(false);
        this.router.navigate(['/admin']);
      },
      error: (erro: any) => {
        this.enviando.set(false);
        const status = erro?.status;
        if (status === 409) {
          this.erro.set(
            'Já existe uma conta com este e-mail. Faça login normalmente.',
          );
          this.modo.set('login');
        } else if (status === 429) {
          this.erro.set(
            'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.',
          );
        } else if (status === 401) {
          this.erro.set('E-mail ou senha inválidos.');
        } else if (status === 400) {
          const detalhes = Array.isArray(erro?.error?.message)
            ? erro.error.message[0]
            : erro?.error?.message;
          this.erro.set(detalhes ?? 'Dados inválidos.');
        } else {
          this.erro.set(
            erro?.error?.message ??
              'Não foi possível concluir. Tente novamente.',
          );
        }
        this.senha = '';
        this.confirmarSenha = '';
      },
    });
  }
}