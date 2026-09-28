import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

type Etapa = 'email' | 'senha' | 'concluido';

@Component({
  selector: 'app-recuperar-senha',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">
      <div class="login-card">
        <button type="button" class="voltar" (click)="voltarParaLogin()">
          ← Voltar para o login
        </button>

        @if (etapa() === 'email') {
          <h1>Recuperar senha</h1>
          <p class="subtitle">
            Informe o e-mail da sua conta. Enviaremos um código para você
            redefinir a senha.
          </p>

          @if (erro()) {
            <p class="aviso erro">{{ erro() }}</p>
          }
          @if (info()) {
            <p class="aviso info">{{ info() }}</p>
          }

          <form (ngSubmit)="solicitar()" autocomplete="on">
            <label for="emailRecuperacao">E-mail</label>
            <input
              id="emailRecuperacao"
              name="email"
              type="email"
              autocomplete="email"
              [(ngModel)]="email"
              placeholder="voce@exemplo.com"
              required
            />
            <button type="submit" class="btn-primary" [disabled]="enviando()">
              {{ enviando() ? 'Enviando...' : 'Enviar código' }}
            </button>
          </form>
          <p class="ajuda">O código é de uso único e expira em 30 minutos.</p>
        }

        @if (etapa() === 'senha') {
          <h1>Nova senha</h1>

          @if (info()) {
            <p class="aviso info">{{ info() }}</p>
          }
          @if (erro()) {
            <p class="aviso erro">{{ erro() }}</p>
          }

          <form (ngSubmit)="redefinir()" autocomplete="off">
            <label for="codigo">Código de recuperação</label>
            <input
              id="codigo"
              name="codigo"
              [(ngModel)]="codigo"
              (ngModelChange)="normalizarCodigo($event)"
              placeholder="Ex: 5F3D9K2Q"
              maxlength="8"
              required
            />

            <label for="novaSenha">Nova senha</label>
            <input
              id="novaSenha"
              name="novaSenha"
              type="password"
              autocomplete="new-password"
              [(ngModel)]="novaSenha"
              placeholder="Mínimo de 6 caracteres"
              minlength="6"
              required
            />

            <label for="confirmarNovaSenha">Confirmar nova senha</label>
            <input
              id="confirmarNovaSenha"
              name="confirmarNovaSenha"
              type="password"
              autocomplete="new-password"
              [(ngModel)]="confirmarSenha"
              placeholder="Digite a nova senha novamente"
              minlength="6"
              required
            />

            <button type="submit" class="btn-primary" [disabled]="enviando()">
              {{ enviando() ? 'Salvando...' : 'Redefinir senha' }}
            </button>
          </form>

          <p class="ajuda">
            <button type="button" class="link-reenviar" (click)="voltarParaEmail()">
              Corrigir e-mail ou reenviar código
            </button>
          </p>
        }

        @if (etapa() === 'concluido') {
          <h1>Senha redefinida!</h1>
          <p class="aviso info">
            Sua senha foi atualizada com sucesso. Faça login com a nova senha.
          </p>
          <button type="button" class="btn-primary" (click)="voltarParaLogin()">
            Ir para o login
          </button>
        }
      </div>
    </div>
  `,
  styles: [
    `
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
      .voltar {
        border: none;
        background: transparent;
        color: var(--text-muted);
        font-size: 0.85rem;
        cursor: pointer;
        padding: 0 0 16px;
      }
      .voltar:hover { color: var(--primary); }
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
      .aviso {
        padding: 12px 14px;
        border-radius: 10px;
        font-size: 0.88rem;
        font-weight: 500;
        margin: 0 0 16px;
      }
      .erro { background: var(--danger-light); color: var(--danger); }
      .info { background: color-mix(in srgb, var(--success) 12%, var(--card)); color: var(--success); }
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
        text-transform: uppercase;
        transition: border-color var(--transition), box-shadow var(--transition);
      }
      input:focus { border-color: var(--primary); box-shadow: 0 0 0 4px var(--primary-light); }
      input::placeholder { color: var(--text-muted); opacity: 0.7; text-transform: none; }
      input#novaSenha, input#confirmarNovaSenha { text-transform: none; }
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
      .link-reenviar {
        border: none;
        background: transparent;
        color: var(--primary);
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        padding: 0;
      }
      .link-reenviar:hover { text-decoration: underline; }
    `,
  ],
})
export class RecuperarSenhaScreenComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  etapa = signal<Etapa>('email');
  email = '';
  codigo = '';
  novaSenha = '';
  confirmarSenha = '';
  enviando = signal(false);
  erro = signal<string | null>(null);
  info = signal<string | null>(null);

  ngOnInit(): void {
    // Acesso via link do e-mail de recuperação: /recuperar-senha?token=XXXX
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.codigo = token.toUpperCase().replace(/[^2-9A-Z]/g, '');
      this.etapa.set('senha');
    }
  }

  solicitar(): void {
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
    if (!emailValido) {
      this.erro.set('Informe um e-mail válido.');
      return;
    }
    this.enviando.set(true);
    this.erro.set(null);
    this.info.set(null);

    this.authService.solicitarRecuperacao(this.email.trim()).subscribe({
      next: (resposta) => {
        this.enviando.set(false);
        this.info.set(resposta.mensagem);
        if (resposta.token) {
          this.codigo = resposta.token;
          this.etapa.set('senha');
        }
      },
      error: (erro: HttpErrorResponse) => this.tratarErro(erro),
    });
  }

  redefinir(): void {
    if (!this.codigo.trim()) {
      this.erro.set('Informe o código de recuperação.');
      return;
    }
    if (this.novaSenha.length < 6) {
      this.erro.set('A nova senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (this.novaSenha !== this.confirmarSenha) {
      this.erro.set('As senhas não conferem.');
      return;
    }
    this.enviando.set(true);
    this.erro.set(null);

    this.authService
      .redefinirSenha(this.codigo.trim(), this.novaSenha, this.confirmarSenha)
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.etapa.set('concluido');
        },
        error: (erro: HttpErrorResponse) => this.tratarErro(erro),
      });
  }

  // Aceita apenas os caracteres do código (maiúsculas, sem 0/O/1/I)
  normalizarCodigo(valor: string): void {
    this.codigo = valor.toUpperCase().replace(/[^2-9A-Z]/g, '');
  }

  voltarParaEmail(): void {
    this.etapa.set('email');
    this.codigo = '';
    this.erro.set(null);
    this.info.set(null);
  }

  voltarParaLogin(): void {
    this.router.navigate(['/']);
  }

  private tratarErro(erro: HttpErrorResponse): void {
    this.enviando.set(false);
    const status = erro?.status;
    if (status === 429) {
      this.erro.set(
        'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
      );
    } else if (status === 400) {
      const detalhes = Array.isArray(erro?.error?.message)
        ? erro.error.message[0]
        : erro?.error?.message;
      this.erro.set(detalhes ?? 'Dados inválidos.');
    } else {
      this.erro.set(
        erro?.error?.message ?? 'Não foi possível concluir. Tente novamente.',
      );
    }
    this.novaSenha = '';
    this.confirmarSenha = '';
  }
}