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
  ProdutoParaSalvar,
  TipoProduto,
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

        <div>
          <label for="tipo">Modo de montagem:</label>
          <select
            id="tipo"
            name="tipo"
            [ngModel]="tipoProduto()"
            (ngModelChange)="definirTipo($event)"
          >
            <option [value]="TIPO.PADRAO">Já vem com tudo (padrão)</option>
            <option [value]="TIPO.MARMITA">Cliente monta do zero</option>
          </select>
          <p class="ingredientes-ajuda">
            @if (ehMarmita()) {
              O cliente começa sem nada e escolhe cada porção. Abaixo, separe as
              escolhas em grupos com limite.
            } @else {
              Todos os ingredientes vêm inclusos e o cliente pode remover ou acrescentar.
            }
          </p>
        </div>

        @if (ehMarmita()) {
          <div class="grupos-form">
            <label>Grupos de escolha</label>
            <p class="ingredientes-ajuda">
              Seções do cardápio com limite de porções. Repetição conta: com limite 2 o
              cliente pode pedir a mesma proteína duas vezes. Um grupo sem ingrediente
              ligado é descartado.
            </p>
            @if (grupos().length === 0) {
              <p class="img-status">Nenhum grupo ainda.</p>
            } @else {
              <ul class="grupos-lista">
                @for (grupo of grupos(); track $index; let i = $index) {
                  <li class="grupo-linha">
                    <input
                      type="text"
                      class="grupo-nome"
                      name="grupoNome{{ i }}"
                      [ngModel]="grupo.nome"
                      (ngModelChange)="definirNomeGrupo(i, $event)"
                      placeholder="Ex: Proteínas"
                      maxlength="60"
                    />
                    <label class="grupo-max">
                      Máx.
                      <input
                        type="number"
                        class="grupo-max-input"
                        name="grupoMax{{ i }}"
                        min="1"
                        max="99"
                        step="1"
                        [ngModel]="grupo.maximoEscolhas"
                        (ngModelChange)="definirMaximoGrupo(i, $event)"
                      />
                    </label>
                    <button
                      type="button"
                      class="grupo-remover"
                      (click)="removerGrupo(i)"
                      [attr.aria-label]="'Remover grupo ' + grupo.nome"
                    >
                      Remover
                    </button>
                  </li>
                }
              </ul>
            }
            <div class="grupo-nova">
              <input
                type="text"
                name="novoGrupo"
                class="grupo-nova-nome"
                [ngModel]="novoGrupoNome()"
                (ngModelChange)="novoGrupoNome.set($event)"
                (keydown.enter)="adicionarGrupo(); $event.preventDefault()"
                placeholder="Nome do novo grupo"
                maxlength="60"
              />
              <button
                type="button"
                class="btn-grupo"
                (click)="adicionarGrupo()"
                [disabled]="!podeAdicionarGrupo()"
              >
                Adicionar grupo
              </button>
            </div>
          </div>
        }

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
                    @if (ehMarmita()) {
                      <label class="ing-adicional-grupo">
                        Grupo
                        <select
                          class="ing-grupo"
                          name="grupoIng{{ ing.id }}"
                          [ngModel]="grupoDoIngrediente(ing.id)"
                          (ngModelChange)="definirGrupoIngrediente(ing.id, $event)"
                        >
                          <option value="">Solto</option>
                          @for (grupo of grupos(); track $index) {
                            <option [value]="grupo.nome">{{ grupo.nome }}</option>
                          }
                        </select>
                      </label>
                    }
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

      .grupos-form { margin-bottom: 18px; }
      .grupos-lista { list-style: none; margin: 0 0 10px; padding: 0; }
      .grupo-linha {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        padding: 9px;
        margin-bottom: 7px;
        border: 1px solid var(--border);
        border-radius: 11px;
        background: var(--surface-hover);
      }
      .grupo-nome { flex: 1; min-width: 0; }
      .grupo-max {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 0.74rem;
        font-weight: 700;
        color: var(--text-muted);
        flex-shrink: 0;
      }
      .grupo-max-input { width: 68px; }
      .grupo-remover {
        border: none;
        background: transparent;
        color: var(--danger);
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        padding: 8px 6px;
        border-radius: 8px;
        flex-shrink: 0;
        transition: background var(--transition);
      }
      .grupo-remover:hover { background: var(--danger-light); }
      .grupo-nova { display: flex; gap: 8px; align-items: center; }
      .grupo-nova-nome { flex: 1; min-width: 0; }
      .btn-grupo {
        border: 1px solid var(--primary);
        background: var(--primary-light);
        color: var(--primary);
        font-size: 0.85rem;
        font-weight: 700;
        cursor: pointer;
        padding: 10px 14px;
        border-radius: 10px;
        white-space: nowrap;
        transition: filter var(--transition), opacity var(--transition);
      }
      .btn-grupo:hover:not(:disabled) { filter: brightness(1.05); }
      .btn-grupo:disabled { opacity: 0.5; cursor: not-allowed; }
      .ing-adicional-linha { flex-wrap: wrap; }
      .ing-adicional-grupo {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 0.74rem;
        font-weight: 700;
        color: var(--text-muted);
      }
      .ing-grupo { min-width: 130px; }
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

  readonly TIPO = { PADRAO: 'PADRAO', MARMITA: 'MARMITA' } as const;

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
  // id do ingrediente -> preço adicional
  ingredientesSelecionados = signal<Record<string, number>>({});
  // id do ingrediente -> nome do grupo (vazio = solto, sem limite)
  gruposDosIngredientes = signal<Record<string, string>>({});
  buscaIngrediente = signal<string>('');

  tipoProduto = signal<TipoProduto>('PADRAO');
  grupos = signal<{ nome: string; maximoEscolhas: number }[]>([]);
  novoGrupoNome = signal<string>('');

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
      this.limparGrupos();
      return;
    }

    this.novoProduto.set({
      nome: produto.nome,
      descricao: produto.descricao || '',
      preco: produto.preco,
      categoriaId: produto.categoriaId,
      imagemUrl: produto.imagemUrl,
      tipo: produto.tipo ?? 'PADRAO',
    });
    this.tipoProduto.set(produto.tipo ?? 'PADRAO');
    this.precoFormatado.set(
      produto.preco.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    );
    const selecao: Record<string, number> = {};
    const vinculos: Record<string, string> = {};
    for (const vinculo of produto.ingredientes ?? []) {
      selecao[vinculo.ingredienteId] = vinculo.precoAdicional ?? 0;
      // O grupo chega por id (grupoId); o nome serve de reserva quando a API
      // não trouxer o id preenchido.
      const nome = vinculo.grupo?.nome ?? '';
      if (nome) vinculos[vinculo.ingredienteId] = nome;
    }
    this.ingredientesSelecionados.set(selecao);
    this.gruposDosIngredientes.set(vinculos);
    this.grupos.set(
      [...(produto.grupos ?? [])]
        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
        .map((g) => ({ nome: g.nome, maximoEscolhas: g.maximoEscolhas })),
    );
    this.novoGrupoNome.set('');
  }

  cancelar(): void {
    this.emEdicao.set(null);
    this.novoProduto.set({ nome: '', descricao: '', preco: 0, categoriaId: '' });
    this.limparPrecoFormatado();
    this.limparIngredientesSelecionados();
    this.limparGrupos();
    this.cancelado.emit();
  }

  ehMarmita(): boolean {
    return this.tipoProduto() === 'MARMITA';
  }

  // Trocar o modo descarta os grupos e os vínculos: eles só fazem sentido na
  // montagem, e manter wreckage deixaria a tela mostrando seções que o
  // salvamento ignoraria.
  definirTipo(tipo: TipoProduto): void {
    if (tipo === this.tipoProduto()) return;
    this.tipoProduto.set(tipo);
    if (tipo === 'PADRAO') {
      this.limparGrupos();
      return;
    }
    this.gruposDosIngredientes.set({});
  }

  podeAdicionarGrupo(): boolean {
    const nome = this.novoGrupoNome().trim();
    return nome !== '' && !this.grupoComNome(nome);
  }

  private grupoComNome(nome: string): boolean {
    return this.grupos().some(
      (g) => g.nome.toLowerCase() === nome.toLowerCase(),
    );
  }

  adicionarGrupo(): void {
    const nome = this.novoGrupoNome().trim();
    // O backend junta grupos de mesmo nome, então deixar dois com o mesmo nome
    // no formulário sóuscaria o teto de um sobrescrever o do outro.
    if (!this.podeAdicionarGrupo()) return;
    this.grupos.update((lista) => [
      ...lista,
      { nome, maximoEscolhas: 2 },
    ]);
    this.novoGrupoNome.set('');
  }

  definirNomeGrupo(indice: number, valor: string): void {
    this.grupos.update((lista) =>
      lista.map((g, i) => (i === indice ? { ...g, nome: valor } : g)),
    );
  }

  definirMaximoGrupo(indice: number, valor: unknown): void {
    const n = Math.trunc(Number(valor));
    // Espelha o limite do DTO: inteiro entre 1 e 99.
    const maximoEscolhas = Number.isFinite(n) ? Math.min(99, Math.max(1, n)) : 1;
    this.grupos.update((lista) =>
      lista.map((g, i) => (i === indice ? { ...g, maximoEscolhas } : g)),
    );
  }

  removerGrupo(indice: number): void {
    const nome = this.grupos()[indice]?.nome;
    this.grupos.update((lista) => lista.filter((_, i) => i !== indice));
    // Ingredientes apontavam para o grupo pelo nome; sem ele, perdem o vínculo.
    if (!nome) return;
    this.gruposDosIngredientes.update((mapa) => {
      const resto = { ...mapa };
      for (const [id, g] of Object.entries(resto)) {
        if (g === nome) delete resto[id];
      }
      return resto;
    });
  }

  private limparGrupos(): void {
    this.grupos.set([]);
    this.gruposDosIngredientes.set({});
    this.novoGrupoNome.set('');
    this.tipoProduto.set('PADRAO');
  }

  grupoDoIngrediente(ingredienteId: string): string {
    return this.gruposDosIngredientes()[ingredienteId] ?? '';
  }

  definirGrupoIngrediente(ingredienteId: string, nome: string): void {
    const atual = this.gruposDosIngredientes();
    if (!nome) {
      const { [ingredienteId]: _removido, ...resto } = atual;
      this.gruposDosIngredientes.set(resto);
      return;
    }
    this.gruposDosIngredientes.set({ ...atual, [ingredienteId]: nome });
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
      // O ingrediente sai do produto, então não pode continuar apontando para
      // um grupo.
      const { [id]: _grupo, ...gruposResto } = this.gruposDosIngredientes();
      this.gruposDosIngredientes.set(gruposResto);
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
    grupo?: string;
  }[] {
    const grupos = this.gruposDosIngredientes();
    return Object.entries(this.ingredientesSelecionados()).map(
      ([ingredienteId, precoAdicional]) => {
        const item: {
          ingredienteId: string;
          precoAdicional: number;
          grupo?: string;
        } = { ingredienteId, precoAdicional: Number(precoAdicional) || 0 };
        const grupo = grupos[ingredienteId];
        if (grupo) item.grupo = grupo;
        return item;
      },
    );
  }

  limparIngredientesSelecionados(): void {
    this.ingredientesSelecionados.set({});
  }

  // Grupo só vale para produto de montagem: em produto comum o servidor ignora,
  // e mandar mesmo assim deixaria vínculo órfão no formulário.
  gruposParaSalvar(): { nome: string; maximoEscolhas: number }[] | undefined {
    if (!this.ehMarmita()) return undefined;
    const usados = new Set(
      Object.values(this.gruposDosIngredientes()).filter(Boolean),
    );
    return this.grupos()
      .map((g) => ({ nome: g.nome.trim(), maximoEscolhas: g.maximoEscolhas }))
      .filter((g) => g.nome !== '' && usados.has(g.nome));
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

    const dados: ProdutoParaSalvar = {
      ...produto,
      tipo: this.tipoProduto(),
      grupos: this.gruposParaSalvar(),
      ingredientes: this.ingredientesParaSalvar(),
    };

    const edicao = this.emEdicao();
    if (edicao?.id) {
      this.atualizarProduto(edicao.id, dados);
    } else {
      this.produtoService.criar(dados).subscribe({
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

  private atualizarProduto(id: string, dados: ProdutoParaSalvar): void {
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