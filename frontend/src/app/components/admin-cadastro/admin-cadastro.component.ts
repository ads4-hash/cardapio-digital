import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ProdutoService,
  Produto,
  Ingrediente,
  resolverImagemUrl,
} from '../../services/produto.service';

// Formulário de cadastro/edição de produto com vínculo de ingredientes e upload de imagem
@Component({
  selector: 'app-admin-cadastro',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="admin-form">
      <h2>{{ emModoEdicao() ? 'Editar Produto' : 'Cadastrar Novo Produto' }}</h2>

      <form (ngSubmit)="salvar()">
        <div>
          <label for="nome">Nome do Produto:</label>
          <input
            type="text"
            id="nome"
            name="nome"
            [(ngModel)]="novoProduto().nome"
            placeholder="Ex: X-Salada"
            required
          />
        </div>

        <div>
          <label for="categoria">Categoria:</label>
          <select
            id="categoria"
            name="categoria"
            [(ngModel)]="novoProduto().categoriaId"
            required
          >
            <option value="" disabled>Selecione uma categoria</option>
            @for (cat of produtoService.categorias(); track cat.id) {
              <option [value]="cat.id">{{ cat.nome }}</option>
            }
          </select>
        </div>

        <div>
          <label for="descricao">Descrição:</label>
          <textarea
            id="descricao"
            name="descricao"
            [(ngModel)]="novoProduto().descricao"
            placeholder="Ex: Pão, hambúrguer 180g, queijo, alface e tomate"
            rows="3"
          ></textarea>
        </div>

        <div>
          <label for="preco">Preço (R$):</label>
          <input
            type="text"
            id="preco"
            name="preco"
            inputmode="decimal"
            placeholder="Ex: 25,90"
            [ngModel]="precoFormatado()"
            (ngModelChange)="onPrecoChange($event)"
            required
          />
        </div>

        <div>
          <label for="imagem">Imagem do produto:</label>
          <div class="arquivo-box">
            @if (novoProduto().imagemUrl) {
              <div class="arquivo-preview">
                <img [src]="resolverImg(novoProduto().imagemUrl)" alt="Pré-visualização da imagem do produto" />
              </div>
            }
            <label class="btn-arquivo" [class.enviando]="enviandoImagem()" for="imagem">
              <input
                type="file"
                id="imagem"
                name="imagem"
                accept="image/*"
                class="arquivo-input"
                (change)="onImagemSelecionada($event)"
                [disabled]="enviandoImagem()"
                aria-label="Escolher imagem do produto"
              />
              @if (enviandoImagem()) {
                <span class="btn-arquivo-spinner" aria-hidden="true"></span>
                <span class="btn-arquivo-texto">
                  <strong>Enviando imagem...</strong>
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
                  <strong>{{ novoProduto().imagemUrl ? 'Trocar imagem' : 'Escolher imagem' }}</strong>
                  <small>JPG, PNG, WEBP ou GIF · até 5 MB</small>
                </span>
              }
            </label>
            @if (novoProduto().imagemUrl && !enviandoImagem()) {
              <button type="button" class="btn-remover" (click)="removerImagem()">
                Remover imagem
              </button>
            }
          </div>
        </div>

        <div class="ingredientes-form">
          <label>Ingredientes</label>
          <p class="ingredientes-ajuda">
            Clique nos ingredientes para incluir no produto. Defina um preço extra para os que o cliente pode adicionar.
          </p>
          @if (ingredientesDisponiveis().length === 0) {
            <p class="img-status">Nenhum ingrediente cadastrado.</p>
          } @else {
            <input
              type="text"
              class="ing-busca"
              name="buscaIngrediente"
              [ngModel]="buscaIngrediente()"
              (ngModelChange)="buscaIngrediente.set($event)"
              placeholder="Buscar ingrediente..."
            />
            @if (ingredientesFiltrados().length === 0) {
              <p class="img-status">Nenhum ingrediente encontrado para "{{ buscaIngrediente() }}".</p>
            } @else {
              <div class="ing-chips">
                @for (ing of ingredientesFiltrados(); track ing.id) {
                  <button
                    type="button"
                    class="chip-select"
                    [class.selecionado]="ingredienteIncluso(ing.id)"
                    (click)="alternarIngrediente(ing.id)"
                  >
                    {{ ing.nome }}
                  </button>
                }
              </div>
            }
            @if (ingredientesDoProduto().length > 0) {
              <div class="ing-adicionais">
                <p class="ing-adicionais-titulo">Adicionais do produto</p>
                @for (ing of ingredientesDoProduto(); track ing.id) {
                  <div class="ing-adicional-linha">
                    <span class="ing-adicional-nome">{{ ing.nome }}</span>
                    <label class="ing-adicional-preco">
                      Extra (R$)
                      <input
                        type="number"
                        class="ing-preco"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        [value]="ingredientePrecoExtra(ing.id)"
                        (change)="definirPrecoIngrediente(ing.id, $event)"
                      />
                    </label>
                  </div>
                }
              </div>
            }
          }
        </div>

        <button type="submit" class="btn-submit" [disabled]="carregandoCadastro || enviandoImagem()">
          {{ emModoEdicao() ? (carregandoCadastro ? 'Salvando...' : 'Salvar Alterações') : (carregandoCadastro ? 'Cadastrando...' : 'Cadastrar Produto') }}
        </button>
        @if (emModoEdicao()) {
          <button type="button" class="btn-cancel" (click)="cancelar()">Cancelar</button>
        }
      </form>
    </section>
  `,
  styles: [
    `
      .arquivo-box {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 14px;
        border: 2px dashed var(--border);
        border-radius: 14px;
        background: var(--surface-hover);
        transition: border-color var(--transition), background var(--transition);
      }
      .arquivo-box:hover {
        border-color: color-mix(in srgb, var(--primary) 55%, var(--border));
        background: color-mix(in srgb, var(--primary-light) 35%, var(--surface-hover));
      }

      .arquivo-input {
        position: absolute;
        width: 1px;
        height: 1px;
        margin: -1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        clip-path: inset(50%);
        white-space: nowrap;
      }

      .btn-arquivo {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: var(--card);
        color: var(--text);
        cursor: pointer;
        box-shadow: var(--shadow-sm);
        transition: border-color var(--transition), color var(--transition), transform var(--transition), box-shadow var(--transition);
      }
      .btn-arquivo:hover {
        border-color: var(--primary);
        color: var(--primary);
        transform: translateY(-1px);
        box-shadow: var(--shadow-md);
      }
      .btn-arquivo:active { transform: translateY(0) scale(0.99); }
      .btn-arquivo:focus-within {
        border-color: var(--primary);
        box-shadow: 0 0 0 4px var(--primary-light);
      }
      .btn-arquivo.enviando { cursor: wait; opacity: 0.85; }

      .btn-arquivo-icone {
        width: 38px;
        height: 38px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        background: var(--primary-light);
        color: var(--primary);
      }
      .btn-arquivo-texto { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .btn-arquivo-texto strong { font-size: 0.92rem; font-weight: 700; }
      .btn-arquivo-texto small { font-size: 0.76rem; color: var(--text-muted); font-weight: 500; line-height: 1.3; }

      .btn-arquivo-spinner {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
        border: 2px solid var(--primary-light);
        border-top-color: var(--primary);
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }

      .arquivo-preview { display: flex; justify-content: center; padding: 4px; }
      .arquivo-preview img {
        max-width: 100%;
        height: 140px;
        object-fit: contain;
        border-radius: 12px;
        border: 1px solid var(--border);
        background: var(--card);
        padding: 6px;
      }

      .btn-remover {
        align-self: flex-start;
        border: none;
        background: transparent;
        color: var(--danger);
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        padding: 5px 8px;
        border-radius: 8px;
        transition: background var(--transition);
      }
      .btn-remover:hover { background: var(--danger-light); }
    `,
  ],
})
export class AdminCadastroComponent implements OnInit {
  protected readonly produtoService = inject(ProdutoService);
  readonly resolverImg = resolverImagemUrl;

  // Produto em edição (null = novo cadastro)
  private readonly emEdicao = signal<Produto | null>(null);

  @Input() set produtoParaEdicao(produto: Produto | null) {
    this.iniciarComProduto(produto);
  }

  @Output() salvo = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();

  novoProduto = signal<Produto>({
    nome: '',
    descricao: '',
    preco: 0,
    categoriaId: '',
  });

  precoFormatado = signal<string>('');
  enviandoImagem = signal(false);
  carregandoCadastro = false;

  ingredientesDisponiveis = signal<Ingrediente[]>([]);
  ingredientesSelecionados = signal<Record<string, number>>({});
  buscaIngrediente = signal<string>('');

  ngOnInit(): void {
    this.carregarIngredientes();
  }

  emModoEdicao(): boolean {
    return this.emEdicao()?.id != null;
  }

  carregarIngredientes(): void {
    this.produtoService.listarIngredientes().subscribe({
      next: (dados) => this.ingredientesDisponiveis.set(dados),
      error: (err) => console.error('Erro ao carregar ingredientes:', err),
    });
  }

  private iniciarComProduto(produto: Produto | null): void {
    this.emEdicao.set(produto);

    if (!produto?.id) {
      this.novoProduto.set({ nome: '', descricao: '', preco: 0, categoriaId: '' });
      this.limparPrecoFormatado();
      this.limparIngredientesSelecionados();
      return;
    }

    this.novoProduto.set({
      nome: produto.nome,
      descricao: produto.descricao || '',
      preco: produto.preco,
      categoriaId: produto.categoriaId,
      imagemUrl: produto.imagemUrl,
    });
    this.precoFormatado.set(
      produto.preco.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    );
    const selecao: Record<string, number> = {};
    for (const vinculo of produto.ingredientes ?? []) {
      selecao[vinculo.ingredienteId] = vinculo.precoAdicional ?? 0;
    }
    this.ingredientesSelecionados.set(selecao);
  }

  cancelar(): void {
    this.emEdicao.set(null);
    this.novoProduto.set({ nome: '', descricao: '', preco: 0, categoriaId: '' });
    this.limparPrecoFormatado();
    this.limparIngredientesSelecionados();
    this.cancelado.emit();
  }

  onPrecoChange(valor: string): void {
    const digitos = valor.replace(/\D/g, '').slice(0, 10);
    if (!digitos) {
      this.precoFormatado.set('');
      return;
    }
    // Interpreta os dígitos da direita (os últimos 2 são os centavos),
    // sem forçar zeros desnecessários na parte inteira.
    const pad = digitos.padStart(3, '0');
    let reais = pad.slice(0, -2).replace(/^0+(?=\d)/, '');
    const centavos = pad.slice(-2);
    if (reais === '0' && digitos.length <= 2) reais = '';
    const reaisGrupos = reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    this.precoFormatado.set(`${reaisGrupos},${centavos}`);
  }

  precoParaNumero(): number {
    return Number(this.precoFormatado().replace(/\./g, '').replace(',', '.'));
  }

  limparPrecoFormatado(): void {
    this.precoFormatado.set('');
  }

  ingredienteIncluso(id: string): boolean {
    return id in this.ingredientesSelecionados();
  }

  // Ingredientes filtrados pelo termo de busca (na tela de cadastro de produto)
  ingredientesFiltrados(): Ingrediente[] {
    const termo = this.buscaIngrediente().trim().toLowerCase();
    if (!termo) return this.ingredientesDisponiveis();
    return this.ingredientesDisponiveis().filter((ing) =>
      ing.nome.toLowerCase().includes(termo),
    );
  }

  // Ingredientes selecionados (objetos completos) na ordem cadastrada
  ingredientesDoProduto(): Ingrediente[] {
    return this.ingredientesDisponiveis().filter((ing) =>
      this.ingredienteIncluso(ing.id),
    );
  }

  ingredientePrecoExtra(id: string): number {
    return this.ingredientesSelecionados()[id] ?? 0;
  }

  alternarIngrediente(id: string): void {
    const atual = this.ingredientesSelecionados();
    if (id in atual) {
      const { [id]: _removido, ...resto } = atual;
      this.ingredientesSelecionados.set(resto);
    } else {
      this.ingredientesSelecionados.set({ ...atual, [id]: 0 });
    }
  }

  definirPrecoIngrediente(id: string, event: Event): void {
    const valor = Number((event.target as HTMLInputElement).value);
    const atual = this.ingredientesSelecionados();
    this.ingredientesSelecionados.set({
      ...atual,
      [id]: isNaN(valor) ? 0 : valor,
    });
  }

  // Monta a lista de ingredientes para enviar ao backend
  ingredientesParaSalvar(): {
    ingredienteId: string;
    precoAdicional: number;
  }[] {
    return Object.entries(this.ingredientesSelecionados()).map(
      ([ingredienteId, precoAdicional]) => ({
        ingredienteId,
        precoAdicional: Number(precoAdicional) || 0,
      }),
    );
  }

  limparIngredientesSelecionados(): void {
    this.ingredientesSelecionados.set({});
  }

  onImagemSelecionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.enviandoImagem.set(true);
    this.produtoService.uploadImagem(file).subscribe({
      next: (res) => {
        this.novoProduto.set({ ...this.novoProduto(), imagemUrl: res.url });
        this.enviandoImagem.set(false);
        input.value = '';
      },
      error: (err) => {
        console.error('Erro ao enviar imagem:', err);
        this.enviandoImagem.set(false);
        input.value = '';
        alert('Erro ao enviar imagem. Verifique o formato/limite (5 MB) e tente novamente.');
      },
    });
  }

  removerImagem(): void {
    this.novoProduto.set({ ...this.novoProduto(), imagemUrl: null });
  }

  salvar(): void {
    const produto = { ...this.novoProduto(), preco: this.precoParaNumero() };
    if (!produto.nome || produto.preco <= 0 || !produto.categoriaId) {
      alert('Por favor, preencha o nome, uma categoria e um preço válido.');
      return;
    }

    this.carregandoCadastro = true;

    const comIngredientes = {
      ...produto,
      ingredientes: this.ingredientesParaSalvar(),
    };

    const edicao = this.emEdicao();
    if (edicao?.id) {
      this.atualizarProduto(edicao.id, comIngredientes);
    } else {
      this.produtoService.criar(comIngredientes).subscribe({
        next: () => {
          this.iniciarComProduto(null);
          this.carregandoCadastro = false;
          this.salvo.emit();
        },
        error: (err) => {
          console.error('Erro ao cadastrar produto:', err);
          this.carregandoCadastro = false;
          alert('Erro ao cadastrar produto. Tente novamente.');
        },
      });
    }
  }

  private atualizarProduto(
    id: string,
    dados: {
      nome: string;
      descricao?: string;
      preco: number;
      categoriaId: string;
      imagemUrl?: string | null;
      ingredientes?: { ingredienteId: string; precoAdicional: number }[];
    },
  ): void {
    this.produtoService.atualizar(id, dados).subscribe({
      next: () => {
        this.iniciarComProduto(null);
        this.carregandoCadastro = false;
        this.salvo.emit();
      },
      error: (err) => {
        console.error('Erro ao editar produto:', err);
        this.carregandoCadastro = false;
        alert('Erro ao salvar alterações. Tente novamente.');
      },
    });
  }
}