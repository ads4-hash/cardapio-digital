import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService, UsuarioLogado } from '../../services/auth.service';

// Edição dos dados do usuário logado (mesmos campos do cadastro)
@Component({
  selector: 'app-admin-perfil',
  standalone: true,
  imports: [FormsModule],
  styleUrls: ['../../ui/cards.css'],
  template: `
    <section>
      <h2 class="section-title section-title--mb">Perfil</h2>

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
            <label for="nome">Nome do estabelecimento <span class="req">*</span></label>
            <input
              id="nome"
              type="text"
              [ngModel]="nome()"
              (ngModelChange)="alterar('nome', $event)"
              name="nome"
              placeholder="Ex: Casa do Lanche"
            />
          </div>

          <div>
            <label for="email">E-mail <span class="req">*</span></label>
            <input
              id="email"
              type="email"
              [ngModel]="email()"
              (ngModelChange)="alterar('email', $event)"
              name="email"
              placeholder="Ex: contato@casa.com"
            />
          </div>

          <div>
            <label for="telefone">Telefone de contato <span class="opcional">(exibido no pedido)</span></label>
            <input
              id="telefone"
              type="tel"
              [ngModel]="telefone()"
              (ngModelChange)="alterar('telefone', $event)"
              name="telefone"
              placeholder="Ex: (11) 99999-9999"
              maxlength="20"
            />
          </div>

          <div>
            <label for="senha">Nova senha <span class="opcional">(opcional)</span></label>
            <div class="senha-wrap">
              <input
                id="senha"
                [type]="mostrarSenha() ? 'text' : 'password'"
                [ngModel]="senha()"
                (ngModelChange)="alterar('senha', $event)"
                name="senha"
                autocomplete="new-password"
                placeholder="Deixe em branco para manter a atual"
                minlength="6"
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
          </div>

          <div>
            <label for="confirmarSenha">Confirmar nova senha <span class="opcional">(opcional)</span></label>
            <div class="senha-wrap">
              <input
                id="confirmarSenha"
                [type]="mostrarConfirmar() ? 'text' : 'password'"
                [ngModel]="confirmarSenha()"
                (ngModelChange)="alterar('confirmarSenha', $event)"
                name="confirmarSenha"
                autocomplete="new-password"
                placeholder="Repita a nova senha"
                minlength="6"
              />
              <button
                type="button"
                class="toggle-senha"
                (click)="mostrarConfirmar.set(!mostrarConfirmar())"
                [attr.aria-label]="mostrarConfirmar() ? 'Ocultar senha' : 'Mostrar senha'"
              >
                {{ mostrarConfirmar() ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>

          @if (exigeSenhaAtual()) {
            <div>
              <label for="senhaAtual">
                Senha atual <span class="req">*</span>
                <span class="opcional">(confirma a alteração)</span>
              </label>
              <div class="senha-wrap">
                <input
                  id="senhaAtual"
                  [type]="mostrarSenhaAtual() ? 'text' : 'password'"
                  [ngModel]="senhaAtual()"
                  (ngModelChange)="alterar('senhaAtual', $event)"
                  name="senhaAtual"
                  autocomplete="current-password"
                  placeholder="Sua senha de acesso"
                />
                <button
                  type="button"
                  class="toggle-senha"
                  (click)="mostrarSenhaAtual.set(!mostrarSenhaAtual())"
                  [attr.aria-label]="mostrarSenhaAtual() ? 'Ocultar senha' : 'Mostrar senha'"
                >
                  {{ mostrarSenhaAtual() ? '🙈' : '👁️' }}
                </button>
              </div>
            </div>
          }

          <div class="acoes">
            @if (alterado()) {
              <button type="submit" class="btn-submit" [disabled]="salvando()">
                {{ salvando() ? 'Salvando...' : 'Salvar alterações' }}
              </button>
            }
          </div>
        </form>
      </div>
    </section>
  `,
  styles: [
    `
    .req { color: var(--danger); }
    .opcional { color: var(--text-muted); font-weight: 500; }
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
  telefone = signal('');
  senha = signal('');
  confirmarSenha = signal('');
  senhaAtual = signal('');
  mostrarSenha = signal(false);
  mostrarConfirmar = signal(false);
  mostrarSenhaAtual = signal(false);
  salvando = signal(false);
  sucesso = signal('');
  erro = signal('');

  // E-mail do usuário como está no servidor, para saber se ele realmente mudou
  private emailOriginal = signal('');

  // O e-mail de acesso é a credencial: trocá-lo, ou trocar a senha, só é
  // aceito com a senha atual. Nome e telefone não pedem reautenticação.
  exigeSenhaAtual = computed(
    () =>
      this.senha().length > 0 ||
      (!!this.emailOriginal() &&
        this.email().trim().toLowerCase() !== this.emailOriginal()),
  );

  // Botão "Salvar alterações" só aparece quando algo foi alterado pelo usuário
  alterado = signal(false);

  // Registra qualquer digitação nos campos e marca o formulário como alterado
  alterar(
    campo:
      | 'nome'
      | 'email'
      | 'telefone'
      | 'senha'
      | 'confirmarSenha'
      | 'senhaAtual',
    valor: string,
  ): void {
    this[campo].set(valor);
    this.alterado.set(true);
  }

  constructor() {
    // Sempre reflete os dados atuais do usuário logado nos campos (funciona
    // mesmo após recarregar a página, quando a sessão é revalidada no guard)
    effect(() => {
      const usuario = this.authService.usuarioLogado();
      if (usuario) {
        this.nome.set(usuario.nome);
        this.email.set(usuario.email);
        this.emailOriginal.set(usuario.email.trim().toLowerCase());
        // O telefone pertence ao estabelecimento do usuário
        this.telefone.set(usuario.estabelecimento?.telefone ?? '');
      }
    });
  }

  salvar(): void {
    this.erro.set('');
    this.sucesso.set('');

    const senha = this.senha();
    const confirmarSenha = this.confirmarSenha();

    // A senha é opcional: só é validada quando o usuário quer alterá-la
    if (senha) {
      if (senha.length < 6) {
        this.erro.set('A senha deve ter pelo menos 6 caracteres.');
        return;
      }
      if (senha !== confirmarSenha) {
        this.erro.set('As senhas não conferem.');
        return;
      }
    }

    // Reautenticação obrigatória quando mexe na credencial de acesso
    if (this.exigeSenhaAtual() && !this.senhaAtual()) {
      this.erro.set('Informe a senha atual para confirmar a alteração.');
      return;
    }

    const dados: {
      nome: string;
      email: string;
      telefone?: string;
      senha?: string;
      confirmarSenha?: string;
      senhaAtual?: string;
    } = {
      nome: this.nome().trim(),
      email: this.email().trim(),
      telefone: this.telefone().trim() || undefined,
    };

    if (senha) {
      dados.senha = senha;
      dados.confirmarSenha = confirmarSenha;
    }
    if (this.senhaAtual()) {
      dados.senhaAtual = this.senhaAtual();
    }

    this.salvando.set(true);
    this.authService
      .atualizarPerfil(dados)
      .subscribe({
        next: (usuario: UsuarioLogado) => {
          this.authService.aplicarPerfil(usuario);
          this.salvando.set(false);
          this.sucesso.set('Perfil atualizado com sucesso!');
          this.senha.set('');
          this.confirmarSenha.set('');
          this.senhaAtual.set('');
          this.mostrarSenha.set(false);
          this.mostrarConfirmar.set(false);
          this.mostrarSenhaAtual.set(false);
          this.alterado.set(false);
        },
        error: (err) => {
          this.salvando.set(false);
          this.erro.set(this.mensagemErro(err));
        },
      });
  }

  private mensagemErro(err: unknown): string {
    if (err && typeof err === 'object') {
      // A API padroniza os erros em `mensagem` (ver ErrosGlobaisFilter); um
      // payload de validação do Nest traz `message` com a lista de problemas.
      const corpo = (
        err as { error?: { mensagem?: string | string[]; message?: string | string[] } }
      ).error;
      const mensagem = corpo?.mensagem ?? corpo?.message;
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