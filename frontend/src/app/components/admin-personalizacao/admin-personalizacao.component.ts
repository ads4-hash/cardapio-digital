import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ConfiguracoesService,
  VisualCardapio,
} from '../../services/configuracoes.service';
import {
  ProdutoService,
  resolverImagemUrl,
} from '../../services/produto.service';

// Personalização visual do cardápio público: cor, tema e logo
@Component({
  selector: 'app-admin-personalizacao',
  standalone: true,
  imports: [FormsModule],
  styleUrls: ['../../ui/upload.css'],
  template: `
    <section class="admin-form personalizacao">
      <h2>Personalizar Cardápio</h2>

      <form (ngSubmit)="salvar()">
        <div>
          <label for="cor">Cor principal:</label>
          <div class="campo-cor">
            <input
              type="color"
              id="cor"
              name="cor"
              [ngModel]="cor()"
              (ngModelChange)="cor.set($event)"
            />
            <input
              type="text"
              name="corHex"
              class="cor-hex"
              [value]="cor()"
              (input)="normalizarCor($event)"
              placeholder="#f43f5e"
            />
          </div>
          <p class="img-status">Cor dos botões, destaques e da marca.</p>
        </div>

        <div>
          <label for="tema">Tema do cardápio para o cliente:</label>
          <select
            id="tema"
            name="tema"
            [ngModel]="tema()"
            (ngModelChange)="tema.set($event)"
          >
            <option value="auto">Auto (segue o dispositivo)</option>
            <option value="claro">Claro</option>
            <option value="escuro">Escuro</option>
          </select>
          <p class="img-status">Força o modo do cardápio público.</p>
        </div>

        <div>
          @if (logoUrl() || enviandoLogo()) {
            <label for="logo">Logo do estabelecimento:</label>
            <div class="arquivo-box">
              @if (logoUrl()) {
                <div class="arquivo-preview logo">
                  <img [src]="resolverImg(logoUrl()!)" alt="Pré-visualização da logo" />
                </div>
              }
              <label class="btn-arquivo" [class.enviando]="enviandoLogo()" for="logo">
                <input
                  type="file"
                  id="logo"
                  name="logo"
                  accept="image/*"
                  class="arquivo-input"
                  (change)="onLogoSelecionada($event)"
                  [disabled]="enviandoLogo()"
                  aria-label="Escolher arquivo da logo"
                />
                @if (enviandoLogo()) {
                  <span class="btn-arquivo-spinner" aria-hidden="true"></span>
                  <span class="btn-arquivo-texto">
                    <strong>Enviando logo...</strong>
                  </span>
                } @else {
                  <span class="btn-arquivo-icone" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
                      <path d="M12 12v9"></path>
                      <path d="m16 16-4-4-4 4"></path>
                    </svg>
                  </span>
                  <span class="btn-arquivo-texto">
                    <strong>Trocar logo</strong>
                    <small>JPG, PNG, WEBP ou GIF · até 5 MB</small>
                  </span>
                }
              </label>
              @if (logoUrl() && !enviandoLogo()) {
                <button type="button" class="btn-remover" (click)="removerLogo()">
                  Remover logo
                </button>
              }
            </div>
          } @else {
            <label class="btn-adicionar-logo" for="logo" role="button" aria-label="Selecionar logo do estabelecimento">
              <input
                type="file"
                id="logo"
                name="logo"
                accept="image/*"
                class="arquivo-input"
                (change)="onLogoSelecionada($event)"
              />
              <span class="btn-arquivo-icone" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
                  <path d="M12 12v9"></path>
                  <path d="m16 16-4-4-4 4"></path>
                </svg>
              </span>
              <span class="btn-arquivo-texto">
                <strong>Adicionar logo</strong>
              </span>
            </label>
          }
        </div>

        <div>
          <label for="capa">Imagem de capa do cardápio:</label>
          <div class="arquivo-box">
            @if (capaUrl()) {
              <div class="arquivo-preview capa">
                <img [src]="resolverImg(capaUrl()!)" alt="Pré-visualização da capa" />
              </div>
            }
            <label class="btn-arquivo" [class.enviando]="enviandoCapa()" for="capa">
              <input
                type="file"
                id="capa"
                name="capa"
                accept="image/*"
                class="arquivo-input"
                (change)="onCapaSelecionada($event)"
                [disabled]="enviandoCapa()"
                aria-label="Escolher arquivo da capa"
              />
              @if (enviandoCapa()) {
                <span class="btn-arquivo-spinner" aria-hidden="true"></span>
                <span class="btn-arquivo-texto">
                  <strong>Enviando capa...</strong>
                </span>
              } @else {
                <span class="btn-arquivo-icone" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
                    <path d="M12 12v9"></path>
                    <path d="m16 16-4-4-4 4"></path>
                  </svg>
                </span>
                <span class="btn-arquivo-texto">
                  <strong>{{ capaUrl() ? 'Trocar capa' : 'Escolher capa' }}</strong>
                  <small>Banner do topo do cardápio · JPG, PNG, WEBP ou GIF · até 5 MB</small>
                </span>
              }
            </label>
            @if (capaUrl() && !enviandoCapa()) {
              <button type="button" class="btn-remover" (click)="removerCapa()">
                Remover capa
              </button>
            }
          </div>
        </div>

        <button type="submit" class="btn-submit" [disabled]="salvando() || enviandoLogo() || enviandoCapa()">
          {{ salvando() ? 'Salvando...' : 'Salvar Personalização' }}
        </button>
        @if (salvo()) {
          <p class="msg-sucesso">Personalização salva e aplicada ao cardápio!</p>
        }
      </form>
    </section>
  `,
  styles: [
    `
      .campo-cor { display: flex; align-items: center; gap: 12px; }
      .campo-cor input[type='color'] {
        width: 56px;
        height: 44px;
        padding: 4px;
        cursor: pointer;
      }
      .cor-hex { flex: 1; min-width: 0; }
      .msg-sucesso {
        margin: 0;
        color: var(--success);
        font-weight: 600;
        font-size: 0.92rem;
      }

      .btn-adicionar-logo {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        max-width: max-content;
        padding: 8px 14px;
        border: 1px dashed var(--border);
        border-radius: 10px;
        background: transparent;
        color: var(--text-muted);
        cursor: pointer;
        font-size: 0.88rem;
        font-weight: 600;
        transition: border-color var(--transition), color var(--transition), background var(--transition);
      }
      .btn-adicionar-logo:hover {
        border-color: var(--primary);
        color: var(--primary);
        background: color-mix(in srgb, var(--primary-light) 35%, transparent);
      }
      .btn-adicionar-logo .btn-arquivo-icone {
        width: 30px;
        height: 30px;
        border-radius: 8px;
      }

      .arquivo-preview.capa img { width: 100%; height: 140px; object-fit: cover; padding: 0; }
    `,
  ],
})
export class AdminPersonalizacaoComponent implements OnInit {
  protected readonly configuracoes = inject(ConfiguracoesService);
  private readonly produtoService = inject(ProdutoService);
  readonly resolverImg = resolverImagemUrl;

  cor = signal<string>('#f43f5e');
  tema = signal<VisualCardapio['tema']>('auto');
  logoUrl = signal<string | null>(null);
  capaUrl = signal<string | null>(null);
  salvando = signal(false);
  salvo = signal(false);
  enviandoLogo = signal(false);
  enviandoCapa = signal(false);

  ngOnInit(): void {
    const atual = this.configuracoes.visualCardapio();
    this.cor.set(atual.cor ?? '#f43f5e');
    this.tema.set(atual.tema);
    this.logoUrl.set(atual.logoUrl);
    this.capaUrl.set(atual.capaUrl);
  }

  // Aceita digitar a cor manualmente (normaliza para #rrggbb válido)
  normalizarCor(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    if (/^#?[0-9a-fA-F]{6}$/.test(valor.trim())) {
      const hex = valor.trim().startsWith('#')
        ? valor.trim().toLowerCase()
        : `#${valor.trim().toLowerCase()}`;
      this.cor.set(hex);
    }
  }

  onLogoSelecionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.enviandoLogo.set(true);
    this.produtoService.uploadImagem(file).subscribe({
      next: (res) => {
        this.logoUrl.set(res.url);
        this.salvo.set(false);
        this.enviandoLogo.set(false);
        input.value = '';
      },
      error: (err) => {
        console.error('Erro ao enviar logo:', err);
        this.enviandoLogo.set(false);
        input.value = '';
        alert('Erro ao enviar a logo. Verifique o formato/limite (5 MB).');
      },
    });
  }

  onCapaSelecionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.enviandoCapa.set(true);
    this.produtoService.uploadImagem(file).subscribe({
      next: (res) => {
        this.capaUrl.set(res.url);
        this.salvo.set(false);
        this.enviandoCapa.set(false);
        input.value = '';
      },
      error: (err) => {
        console.error('Erro ao enviar capa:', err);
        this.enviandoCapa.set(false);
        input.value = '';
        alert('Erro ao enviar a capa. Verifique o formato/limite (5 MB).');
      },
    });
  }

  removerLogo(): void {
    this.logoUrl.set(null);
    this.salvo.set(false);
  }

  removerCapa(): void {
    this.capaUrl.set(null);
    this.salvo.set(false);
  }

  salvar(): void {
    const cor = this.cor().trim();
    const corFinal = /^#?[0-9a-fA-F]{6}$/.test(cor)
      ? (cor.startsWith('#') ? cor.toLowerCase() : `#${cor.toLowerCase()}`)
      : null;

    this.salvando.set(true);
    this.salvo.set(false);
    this.configuracoes
      .salvarVisualCardapio({
        cor: corFinal,
        tema: this.tema(),
        logoUrl: this.logoUrl(),
        capaUrl: this.capaUrl(),
      })
      .subscribe({
        next: () => {
          this.salvando.set(false);
          this.salvo.set(true);
        },
        error: (err) => {
          console.error('Erro ao salvar personalização:', err);
          this.salvando.set(false);
          alert('Erro ao salvar a personalização. Tente novamente.');
        },
      });
  }
}