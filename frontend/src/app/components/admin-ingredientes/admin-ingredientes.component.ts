import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProdutoService } from '../../services/produto.service';
import { mensagemDoErro } from '../../core/mensagens-erro';

// Ordenação alfabética de verdade (pt-BR): ignora caixa e acentos, então
// "azeitona" fica perto de "Azeitona" e "Queijo" depois de "Cebola" (o
// backend ordena por `nome` ASC, mas com collation binária "Z" viria antes de "a").
const colador = new Intl.Collator('pt-BR', { sensitivity: 'base' });

// Gestor de ingredientes: listar, adicionar e remover
@Component({
  selector: 'app-admin-ingredientes',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="admin-form">
      <h2>Gerenciar Ingredientes</h2>
      <div class="gestor-novo">
        <input
          type="text"
          [ngModel]="novoNome()"
          (ngModelChange)="novoNome.set($event)"
          placeholder="Novo ingrediente (ex: Bacon)"
          (keyup.enter)="criar()"
        />
        <button (click)="criar()">Adicionar</button>
      </div>
      @if (erro(); as e) {
        <div class="aviso erro" role="alert" aria-live="assertive">
          <strong>{{ e.titulo }}</strong>
          <span>{{ e.detalhe }}</span>
        </div>
      }
      @if (ingredientes().length === 0) {
        <p class="img-status">Nenhum ingrediente cadastrado.</p>
      } @else {
        <div class="ing-chips">
          @for (ing of ingredientesOrdenados(); track ing.id) {
            <span class="chip">
              {{ ing.nome }}
              <button class="chip-remove" (click)="remover(ing.id)">✕</button>
            </span>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      .aviso {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 12px 14px;
        border-radius: 10px;
        font-size: 0.88rem;
        line-height: 1.45;
        margin: 0 0 16px;
      }
      .aviso strong { font-size: 0.9rem; font-weight: 700; }
      .erro {
        background: var(--danger-light);
        color: var(--danger);
        border: 1px solid color-mix(in srgb, var(--danger) 30%, transparent);
      }
    `,
  ],
})
export class AdminIngredientesComponent implements OnInit {
  private readonly produtoService = inject(ProdutoService);

  ingredientes = signal<{ id: string; nome: string }[]>([]);
  novoNome = signal<string>('');
  erro = signal<{ titulo: string; detalhe: string } | null>(null);

  // Lista exibida em ordem alfabética (pt-BR), sem alterar os dados carregados.
  ingredientesOrdenados = computed(() =>
    [...this.ingredientes()].sort((a, b) => colador.compare(a.nome, b.nome)),
  );

  ngOnInit(): void {
    this.carregar();
  }

  private carregar(): void {
    this.produtoService.listarIngredientes().subscribe({
      next: (dados) => this.ingredientes.set(dados),
      error: (err: HttpErrorResponse) => {
        console.error('Erro ao carregar ingredientes:', err);
        this.erro.set(
          this.explicarErro(err, 'carregar a lista de ingredientes'),
        );
      },
    });
  }

  criar(): void {
    const nome = this.novoNome().trim();
    if (!nome) {
      this.erro.set({
        titulo: 'Nome vazio',
        detalhe:
          'Digite o nome do ingrediente no campo acima antes de adicionar.',
      });
      return;
    }

    this.erro.set(null);
    this.produtoService.criarIngrediente({ nome }).subscribe({
      next: () => {
        this.novoNome.set('');
        this.carregar();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Erro ao criar ingrediente:', err);
        this.erro.set(this.explicarErro(err, `criar o ingrediente "${nome}"`));
      },
    });
  }

  remover(id: string): void {
    if (!confirm('Deseja remover este ingrediente?')) return;
    this.erro.set(null);
    this.produtoService.excluirIngrediente(id).subscribe({
      next: () => this.carregar(),
      error: (err: HttpErrorResponse) => {
        console.error('Erro ao remover ingrediente:', err);
        this.erro.set(this.explicarErro(err, 'remover o ingrediente'));
      },
    });
  }

  // Monta um aviso com título + explicação da causa, para o usuário entender o
  // que aconteceu em vez de ver só "deu erro".
  private explicarErro(
    erro: HttpErrorResponse,
    acao: string,
  ): { titulo: string; detalhe: string } {
    const status = erro?.status ?? 0;
    const mensagem = mensagemDoErro(erro);

    if (status === 409) {
      return {
        titulo: mensagem ?? 'Ingrediente repetido',
        detalhe:
          'Já existe um ingrediente com esse nome. Use um nome diferente para não ficar com dois adicionais iguais dividindo o cardápio.',
      };
    }

    if (status === 400) {
      return {
        titulo: 'Não foi possível salvar',
        detalhe:
          mensagem ??
          'O nome informado não é válido. Ajuste o texto e tente novamente.',
      };
    }

    if (status === 401 || status === 403) {
      return {
        titulo: 'Sessão expirada',
        detalhe: 'Sua sessão expirou. Entre novamente para continuar.',
      };
    }

    if (status === 0) {
      return {
        titulo: 'Sem conexão com o servidor',
        detalhe:
          'Não conseguimos falar com o servidor. Verifique sua internet e tente de novo.',
      };
    }

    if (status >= 500) {
      return {
        titulo: 'Erro no servidor',
        detalhe: `O servidor não conseguiu ${acao}. Tente novamente em alguns instantes.`,
      };
    }

    return {
      titulo: 'Não foi possível concluir',
      detalhe: mensagem ?? `Não foi possível ${acao}. Tente novamente.`,
    };
  }
}