import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ProdutoService,
  resolverImagemUrl,
} from '../../services/produto.service';
import type {
  Produto,
  Ingrediente,
  ProdutoParaSalvar,
  TipoProduto,
} from '../../models/produto.model';
import {
  formatarEntradaPreco,
  precoFormatadoParaNumero,
} from '../../utils/moeda';
import { gruposOrdenados } from '../../utils/grupos';

// Formulário de cadastro/edição de produto com vínculo de ingredientes e upload de imagem
@Component({
  selector: 'app-admin-cadastro',
  standalone: true,
  imports: [FormsModule],
  styleUrls: ['../../ui/upload.css', './admin-cadastro.component.css'],
  templateUrl: './admin-cadastro.component.html',
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

  novoProduto = signal<ProdutoParaSalvar>({
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
  grupos = signal<
    { nome: string; maximoEscolhas: number; minimoEscolhas: number }[]
  >([]);
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
      gruposOrdenados(produto.grupos).map((g) => ({
        nome: g.nome,
        maximoEscolhas: g.maximoEscolhas,
        minimoEscolhas: g.minimoEscolhas ?? 0,
      })),
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
      { nome, maximoEscolhas: 2, minimoEscolhas: 0 },
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
      lista.map((g, i) =>
        i === indice
          ? {
              ...g,
              maximoEscolhas,
              // O piso nunca pode passar do teto.
              minimoEscolhas: Math.min(g.minimoEscolhas, maximoEscolhas),
            }
          : g,
      ),
    );
  }

  definirMinimoGrupo(indice: number, valor: unknown): void {
    const n = Math.trunc(Number(valor));
    // Espelha o piso do DTO: inteiro entre 0 e o teto do grupo.
    const base = Number.isFinite(n) ? Math.max(0, n) : 0;
    this.grupos.update((lista) =>
      lista.map((g, i) =>
        i === indice
          ? { ...g, minimoEscolhas: Math.min(base, g.maximoEscolhas) }
          : g,
      ),
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
    this.precoFormatado.set(formatarEntradaPreco(valor));
  }

  precoParaNumero(): number {
    return precoFormatadoParaNumero(this.precoFormatado());
  }

  limparPrecoFormatado(): void {
    this.precoFormatado.set('');
  }

  ingredienteIncluso(id: string): boolean {
    return id in this.ingredientesSelecionados();
  }

  // Ingredientes filtrados pelo termo de busca (na tela de cadastro de produto).
  // Os já selecionados aparecem no topo para facilitar a remoção.
  ingredientesFiltrados(): Ingrediente[] {
    const termo = this.buscaIngrediente().trim().toLowerCase();
    const lista = termo
      ? this.ingredientesDisponiveis().filter((ing) =>
          ing.nome.toLowerCase().includes(termo),
        )
      : this.ingredientesDisponiveis();
    return [
      ...lista.filter((ing) => this.ingredienteIncluso(ing.id)),
      ...lista.filter((ing) => !this.ingredienteIncluso(ing.id)),
    ];
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
  gruposParaSalvar():
    | { nome: string; maximoEscolhas: number; minimoEscolhas: number }[]
    | undefined {
    if (!this.ehMarmita()) return undefined;
    const usados = new Set(
      Object.values(this.gruposDosIngredientes()).filter(Boolean),
    );
    return this.grupos()
      .map((g) => ({
        nome: g.nome.trim(),
        maximoEscolhas: g.maximoEscolhas,
        minimoEscolhas: g.minimoEscolhas,
      }))
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