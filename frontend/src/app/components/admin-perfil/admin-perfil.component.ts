import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ConfiguracoesService } from '../../services/configuracoes.service';
import { ProdutoService, resolverImagemUrl } from '../../services/produto.service';
import { mensagemDoErro } from '../../core/mensagens-erro';
import { SENHA_MENSAGEM, senhaForteValida } from '../../core/senha';
import type { UsuarioLogado } from '../../models/auth.model';
import type { PixConfiguracao, TipoChavePix } from '../../models/configuracao.model';

// Opções do select "tipo da chave Pix" (Banco Central)
const TIPOS_CHAVE: { valor: TipoChavePix; rotulo: string }[] = [
  { valor: 'CPF', rotulo: 'CPF' },
  { valor: 'CNPJ', rotulo: 'CNPJ' },
  { valor: 'TELEFONE', rotulo: 'Telefone' },
  { valor: 'EMAIL', rotulo: 'E-mail' },
  { valor: 'ALEATORIA', rotulo: 'Chave aleatória' },
];

// Edição dos dados do usuário logado (mesmos campos do cadastro) + dados
// Pix que o cliente recebe na mensagem de WhatsApp quando paga com Pix
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

      <div class="admin-form pix-form">
        <h2>Dados para pagamento Pix</h2>
        <p class="pix-ajuda">
          O cliente que escolhe Pix no checkout recebe estes dados (e o QR Code,
          se enviado) na mensagem de WhatsApp com o resumo do pedido.
        </p>

        @if (pixSucesso()) {
          <p class="msg-ok">{{ pixSucesso() }}</p>
        }
        @if (pixErro()) {
          <p class="msg-erro">{{ pixErro() }}</p>
        }

        <form (ngSubmit)="salvarPix()">
          <div>
            <label for="pixTipo">Tipo da chave <span class="req">*</span></label>
            <select
              id="pixTipo"
              [ngModel]="pixTipo()"
              (ngModelChange)="alterarPix('tipoChave', $event)"
              name="pixTipo"
            >
              <option value="">Selecione o tipo...</option>
              @for (opcao of tiposChave; track opcao.valor) {
                <option [value]="opcao.valor">{{ opcao.rotulo }}</option>
              }
            </select>
          </div>

          <div>
            <label for="pixChave">Chave <span class="req">*</span></label>
            <input
              id="pixChave"
              type="text"
              [ngModel]="pixChave()"
              (ngModelChange)="alterarPix('chave', $event)"
              name="pixChave"
              placeholder="Ex: 123.456.789-00 ou email@exemplo.com"
              maxlength="140"
            />
          </div>

          <div>
            <label for="pixTitular">Titular da conta <span class="opcional">(opcional)</span></label>
            <input
              id="pixTitular"
              type="text"
              [ngModel]="pixTitular()"
              (ngModelChange)="alterarPix('titular', $event)"
              name="pixTitular"
              placeholder="Ex: Maria da Silva"
              maxlength="140"
            />
          </div>

          <div>
            <label for="pixInstituicao">Instituição / banco <span class="opcional">(opcional)</span></label>
            <input
              id="pixInstituicao"
              type="text"
              [ngModel]="pixInstituicao()"
              (ngModelChange)="alterarPix('instituicao', $event)"
              name="pixInstituicao"
              placeholder="Ex: Nubank"
              maxlength="140"
            />
          </div>

          <div>
            <label for="pixQr">QR Code <span class="opcional">(opcional)</span></label>
            @if (pixQrUrl()) {
              <div class="qr-preview">
                <img [src]="resolverImagem(pixQrUrl())" alt="QR Code Pix" />
                <button type="button" class="btn-remover" (click)="removerQrPix()">
                  Remover QR
                </button>
              </div>
            } @else {
              <input
                id="pixQr"
                type="file"
                accept="image/*"
                [disabled]="pixEnviandoQr()"
                (change)="enviarQrPix($event)"
              />
              @if (pixEnviandoQr()) {
                <p class="opcional">Enviando imagem...</p>
              }
            }
          </div>

          <div class="acoes">
            @if (pixAlterado()) {
              <button type="submit" class="btn-submit" [disabled]="pixSalvando()">
                {{ pixSalvando() ? 'Salvando...' : 'Salvar dados Pix' }}
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
    .pix-form { margin-top: 24px; }
    .pix-ajuda { color: var(--text-muted); font-size: 0.85rem; margin: -6px 0 16px; }
    .qr-preview { display: flex; align-items: center; gap: 14px; }
    .qr-preview img { width: 120px; height: 120px; object-fit: contain; border-radius: 10px; border: 1px solid var(--border); background: #fff; padding: 6px; }
    .btn-remover {
      border: 1px solid var(--danger);
      color: var(--danger);
      background: transparent;
      padding: 8px 14px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.85rem;
      transition: background var(--transition);
    }
    .btn-remover:hover { background: var(--danger-light); }
    `,
  ],
})
export class AdminPerfilComponent {
  private readonly authService = inject(AuthService);
  private readonly configuracoes = inject(ConfiguracoesService);
  private readonly produtoService = inject(ProdutoService);

  // Select de tipo de chave Pix exposto ao template
  readonly tiposChave = TIPOS_CHAVE;

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

  // Estado do formulário de dados Pix (segundo card da tela)
  pixTipo = signal('');
  pixChave = signal('');
  pixTitular = signal('');
  pixInstituicao = signal('');
  pixQrUrl = signal('');
  pixSalvando = signal(false);
  pixEnviandoQr = signal(false);
  pixSucesso = signal('');
  pixErro = signal('');
  pixAlterado = signal(false);

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

  // Registra digitação nos campos Pix (select e inputs)
  alterarPix(
    campo: 'tipoChave' | 'chave' | 'titular' | 'instituicao',
    valor: string,
  ): void {
    if (campo === 'tipoChave') this.pixTipo.set(valor);
    if (campo === 'chave') this.pixChave.set(valor);
    if (campo === 'titular') this.pixTitular.set(valor);
    if (campo === 'instituicao') this.pixInstituicao.set(valor);
    this.pixAlterado.set(true);
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
        // Carrega os dados Pix do estabelecimento (cacheado no serviço)
        this.configuracoes.carregarPix();
      }
    });

    // Espelha o Pix vindo do servidor no formulário, mas só enquanto o admin
    // não mexeu nos campos (senão uma resposta atrasada apagaria o rascunho)
    effect(() => {
      const pix = this.configuracoes.pix();
      if (this.pixAlterado()) return;
      this.pixTipo.set(pix.tipoChave ?? '');
      this.pixChave.set(pix.chave ?? '');
      this.pixTitular.set(pix.titular ?? '');
      this.pixInstituicao.set(pix.instituicao ?? '');
      this.pixQrUrl.set(pix.qrUrl ?? '');
    });
  }

  salvar(): void {
    this.erro.set('');
    this.sucesso.set('');

    const senha = this.senha();
    const confirmarSenha = this.confirmarSenha();

    // A senha é opcional: só é validada quando o usuário quer alterá-la
    if (senha) {
      if (!senhaForteValida(senha)) {
        this.erro.set(SENHA_MENSAGEM);
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
          this.erro.set(
            mensagemDoErro(err) ??
              'Não foi possível salvar o perfil. Tente novamente.',
          );
        },
      });
  }

  // Envia o QR Code Pix escolhido e guarda a URL relativa devolvida pelo
  // upload (mesmo endpoint de imagem dos produtos, com validação de tipo/tamanho)
  enviarQrPix(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    input.value = '';
    if (!arquivo) return;

    this.pixErro.set('');
    this.pixEnviandoQr.set(true);
    this.produtoService.uploadImagem(arquivo).subscribe({
      next: (res) => {
        this.pixEnviandoQr.set(false);
        this.pixQrUrl.set(res.url);
        this.pixAlterado.set(true);
      },
      error: (err) => {
        this.pixEnviandoQr.set(false);
        this.pixErro.set(
          mensagemDoErro(err) ?? 'Não foi possível enviar a imagem. Tente novamente.',
        );
      },
    });
  }

  // Marca o QR para remoção (o PATCH envia null e o servidor apaga a chave)
  removerQrPix(): void {
    this.pixQrUrl.set('');
    this.pixAlterado.set(true);
  }

  // URL completa para exibir a imagem do QR no preview (SSR-safe)
  resolverImagem(url: string | null): string {
    return resolverImagemUrl(url) ?? '';
  }

  salvarPix(): void {
    this.pixErro.set('');
    this.pixSucesso.set('');

    if (!this.pixTipo()) {
      this.pixErro.set('Informe o tipo da chave Pix.');
      return;
    }
    if (!this.pixChave().trim()) {
      this.pixErro.set('Informe a chave Pix para receber por Pix.');
      return;
    }

    const dados: Partial<PixConfiguracao> = {
      tipoChave: this.pixTipo() as TipoChavePix,
      chave: this.pixChave().trim(),
      titular: this.pixTitular().trim() || null,
      instituicao: this.pixInstituicao().trim() || null,
      qrUrl: this.pixQrUrl() || null,
    };

    this.pixSalvando.set(true);
    this.configuracoes.salvarPix(dados).subscribe({
      next: () => {
        this.pixSalvando.set(false);
        this.pixAlterado.set(false);
        this.pixSucesso.set('Dados Pix salvos com sucesso!');
      },
      error: (err) => {
        this.pixSalvando.set(false);
        this.pixErro.set(
          mensagemDoErro(err) ?? 'Não foi possível salvar os dados Pix. Tente novamente.',
        );
      },
    });
  }
}
