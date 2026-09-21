import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService, UsuarioLogado } from '../../services/auth.service';

// Edição dos dados do usuário logado (mesmos campos do cadastro)
@Component({
  selector: 'app-admin-perfil',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section>
      <h2 class="perfil-titulo">Perfil</h2>

      <div class="admin-form">
        <h2>Editar dados do usuário</h2>

        @if (sucesso()) {
          <p class="msg-ok">{{ sucesso() }}</p>
        }
        @if (erro()) {
          <p class="msg-erro">{{ erro() }}</p>
        }

        <form (ngSubmit)="salvar()">
          <div>
            <label for="nome">Nome de usuário <span class="req">*</span></label>
            <input
              id="nome"
              type="text"
              [ngModel]="nome()"
              (ngModelChange)="nome.set($event)"
              name="nome"
              placeholder="Ex: cozinha01"
            />
          </div>

          <div>
            <label for="email">E-mail <span class="req">*</span></label>
            <input
              id="email"
              type="email"
              [ngModel]="email()"
              (ngModelChange)="email.set($event)"
              name="email"
              placeholder="Ex: contato@casa.com"
            />
          </div>

          <div>
            <label for="senha">Nova senha <span class="req">*</span></label>
            <input
              id="senha"
              type="password"
              [ngModel]="senha()"
              (ngModelChange)="senha.set($event)"
              name="senha"
              placeholder="Mínimo de 6 caracteres"
            />
          </div>

          <div>
            <label for="confirmarSenha">Confirmar senha <span class="req">*</span></label>
            <input
              id="confirmarSenha"
              type="password"
              [ngModel]="confirmarSenha()"
              (ngModelChange)="confirmarSenha.set($event)"
              name="confirmarSenha"
              placeholder="Repita a nova senha"
            />
          </div>

          <div class="acoes">
            <button type="submit" class="btn-submit" [disabled]="salvando()">
              {{ salvando() ? 'Salvando...' : 'Salvar alterações' }}
            </button>
          </div>
        </form>
      </div>
    </section>
  `,
  styles: [
    `
    .perfil-titulo { margin: 0 0 16px; font-size: 1.25rem; font-weight: 800; letter-spacing: -0.015em; }
    .req { color: var(--danger); }
    .msg-ok { background: var(--accent-light); color: var(--accent-dark); padding: 12px; border-radius: 10px; font-size: 0.88rem; font-weight: 500; }
    .msg-erro { background: var(--danger-light); color: var(--danger); padding: 12px; border-radius: 10px; font-size: 0.88rem; font-weight: 500; }
    .acoes { display: flex; gap: 10px; }
    `,
  ],
})
export class AdminPerfilComponent {
  private readonly authService = inject(AuthService);

  nome = signal('');
  email = signal('');
  senha = signal('');
  confirmarSenha = signal('');
  salvando = signal(false);
  sucesso = signal('');
  erro = signal('');

  constructor() {
    // Pré-preenche com os dados atuais do usuário logado
    const usuario = this.authService.usuarioLogado();
    if (usuario) {
      this.nome.set(usuario.nome);
      this.email.set(usuario.email);
    }
  }

  salvar(): void {
    this.erro.set('');
    this.sucesso.set('');

    if (this.senha() !== this.confirmarSenha()) {
      this.erro.set('As senhas não conferem.');
      return;
    }

    this.salvando.set(true);
    this.authService
      .atualizarPerfil({
        nome: this.nome().trim(),
        email: this.email().trim(),
        senha: this.senha(),
        confirmarSenha: this.confirmarSenha(),
      })
      .subscribe({
        next: (usuario: UsuarioLogado) => {
          this.authService.aplicarPerfil(usuario);
          this.salvando.set(false);
          this.sucesso.set('Perfil atualizado com sucesso!');
          this.senha.set('');
          this.confirmarSenha.set('');
        },
        error: (err) => {
          this.salvando.set(false);
          this.erro.set(this.mensagemErro(err));
        },
      });
  }

  private mensagemErro(err: unknown): string {
    if (err && typeof err === 'object') {
      const corpo = (err as { error?: { message?: string | string[] } }).error;
      const mensagem = corpo?.message;
      if (Array.isArray(mensagem)) {
        return mensagem[0] ?? 'Não foi possível salvar o perfil.';
      }
      if (typeof mensagem === 'string') {
        return mensagem;
      }
    }
    return 'Não foi possível salvar o perfil. Tente novamente.';
  }
}