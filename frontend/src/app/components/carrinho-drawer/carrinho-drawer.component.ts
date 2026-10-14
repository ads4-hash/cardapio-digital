import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import type { CartItem, ItemIngrediente } from '../../models/cart.model';
import { PedidoService } from '../../services/pedidos.service';
import type { TipoEntrega, FormaPagamento } from '../../models/pedido.model';
import { ConfiguracoesService } from '../../services/configuracoes.service';
import { ProdutoService } from '../../services/produto.service';
import type { Produto } from '../../models/produto.model';
import { EstabelecimentoContextoService } from '../../services/estabelecimento-contexto.service';
import { PersonalizacaoProdutoComponent } from '../personalizacao-produto/personalizacao-produto.component';
import {
  agruparAdicionados,
  nomesIngredientes,
} from '../../utils/ingredientes';
import { mensagemDoErro } from '../../core/mensagens-erro';

type Etapa = 'carrinho' | 'checkout' | 'sucesso';

@Component({
  selector: 'app-carrinho-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PersonalizacaoProdutoComponent],
  templateUrl: './carrinho-drawer.component.html',
  styleUrls: ['./carrinho-drawer.component.css'],
})
export class CarrinhoDrawerComponent {
  cartService = inject(CartService);
  private readonly pedidoService = inject(PedidoService);
  private readonly produtoService = inject(ProdutoService);
  private readonly contexto = inject(EstabelecimentoContextoService);
  readonly configuracoes = inject(ConfiguracoesService);

  isOpen = signal<boolean>(false);
  erro = signal<string | null>(null);
  // Item do carrinho aberto no modal de correção de ingredientes
  itemEmEdicao = signal<CartItem | null>(null);
  etapa = signal<Etapa>('carrinho');
  cliente = signal<string>('');
  telefone = signal<string>('');
  endereco = signal<string>('');
  tipoEntrega = signal<TipoEntrega | null>(null);
  formaPagamento = signal<FormaPagamento>('DINHEIRO');
  desejaTroco = signal(false);
  trocoPara = signal<number | null>(null);
  enviando = signal(false);
  pedidoSucesso = signal<string>('');
  pedidoId = signal<string>('');

  readonly todasFormasPagamento: {
    valor: FormaPagamento;
    rotulo: string;
  }[] = [
    { valor: 'DINHEIRO', rotulo: '💵 Dinheiro' },
    { valor: 'PIX', rotulo: '🟢 Pix' },
    { valor: 'CARTAO', rotulo: '💳 Cartão' },
  ];

  // Na retirada o cliente paga no balcão, então só entram as formas que fazem
  // sentido ali. Cartão segue disponível apenas para entrega.
  formasPagamento = computed(() =>
    this.tipoEntrega() === 'RETIRADA'
      ? this.todasFormasPagamento.filter((f) => f.valor !== 'CARTAO')
      : this.todasFormasPagamento,
  );

  // Trocar a forma de recebimento pode tirar a forma de pagamento escolhida da
  // lista (ex.: estava no cartão e virou retirada). Sem isso o checkout ficaria
  // sem nenhuma opção marcada.
  selecionarTipoEntrega(t: TipoEntrega): void {
    this.tipoEntrega.set(t);
    if (!this.formasPagamento().some((f) => f.valor === this.formaPagamento())) {
      this.formaPagamento.set('DINHEIRO');
    }
  }

  selecionarPagamento(f: FormaPagamento): void {
    this.formaPagamento.set(f);
    if (f !== 'DINHEIRO') {
      this.desejaTroco.set(false);
      this.trocoPara.set(null);
    }
  }

  // Taxa aplicada apenas quando a forma de receber escolhida é 'ENTREGA'
  taxa = computed(() =>
    this.tipoEntrega() === 'ENTREGA' ? this.configuracoes.taxaEntrega() : 0,
  );
  totalComTaxa = computed(() => this.cartService.totalPrice() + this.taxa());

  async irParaCheckout(): Promise<void> {
    if (!this.tipoEntrega()) {
      this.erro.set('Escolha como deseja receber o pedido.');
      return;
    }
    const removidos = await this.limparItensIndisponiveis();
    if (removidos.length > 0) {
      this.erro.set(
        `Alguns itens saíram do cardápio e foram removidos do carrinho: ${removidos.join(', ')}`,
      );
      return;
    }
    this.erro.set(null);
    this.etapa.set('checkout');
  }

  // Remove do carrinho itens cujo produto não existe mais no catálogo atual
  // (busca a lista fresca da API, de forma que exclusões feitas no painel
  // sejam consideradas mesmo com a tela usando cache). Retorna os nomes dos
  // itens removidos.
  private async limparItensIndisponiveis(): Promise<string[]> {
    const catalogo = await this.produtoService.carregarProdutosAtualizados();
    if (catalogo.length === 0) return [];
    const disponiveis = new Set(catalogo.map((p) => p.id));
    const removidos: string[] = [];
    const restantes: {
      uid: string;
      produto: Produto;
      quantidade: number;
      precoUnitario: number;
      personalizacao: { removidos: ItemIngrediente[]; adicionados: ItemIngrediente[] };
    }[] = [];
    for (const item of this.cartService.items()) {
      if (item.produto.id && disponiveis.has(item.produto.id)) {
        restantes.push(item);
      } else {
        removidos.push(item.produto.nome);
      }
    }
    if (removidos.length > 0) {
      this.cartService.atualizarItens(restantes);
    }
    return removidos;
  }

  async abrirCarrinho(): Promise<void> {
    const removidos = await this.limparItensIndisponiveis();
    if (removidos.length > 0) {
      this.erro.set(
        `${removidos.join(', ')} saiu do cardápio e foi removido do carrinho.`,
      );
    }
    this.isOpen.set(true);
  }

  // Formatações usadas pelo template (ver utils/ingredientes.ts)
  readonly nomesIngredientes = nomesIngredientes;
  readonly agruparAdicionados = agruparAdicionados;

  // Abre o modal de personalização já carregado com o estado do item, para o
  // cliente corrigir o que removeu ou esqueceu de adicionar.
  abrirEdicao(item: CartItem): void {
    this.itemEmEdicao.set(item);
  }

  fecharEdicao(): void {
    this.itemEmEdicao.set(null);
  }

  voltarCheckout(): void {
    this.erro.set(null);
    this.etapa.set('carrinho');
  }

  async confirmarPedido(): Promise<void> {
    if (!this.configuracoes.aceitandoPedidos()) {
      this.erro.set('A casa está offline e não está recebendo pedidos.');
      return;
    }

    if (!this.cliente().trim()) {
      this.erro.set('Informe seu nome para continuar.');
      return;
    }

    if (!this.telefone().trim()) {
      this.erro.set('Informe um telefone de contato.');
      return;
    }

    if (!this.tipoEntrega()) {
      this.erro.set('Escolha como deseja receber o pedido.');
      return;
    }

    if (this.tipoEntrega() === 'ENTREGA' && !this.endereco().trim()) {
      this.erro.set('Informe o endereço de entrega.');
      return;
    }

    if (this.cartService.items().length === 0) return;

    const indisponiveis = await this.limparItensIndisponiveis();
    if (indisponiveis.length > 0) {
      this.erro.set(
        `${indisponiveis.join(', ')} saiu do cardápio e foi removido do carrinho. Revise antes de enviar.`,
      );
      return;
    }

    // Troco: só faz sentido em dinheiro e exige o valor a ser pago. O total é
    // validado aqui e reforçado no servidor (trocoPara >= total).
    let trocoPara: number | undefined;
    if (this.formaPagamento() === 'DINHEIRO' && this.desejaTroco()) {
      const numero = this.trocoPara();
      if (numero == null || !Number.isFinite(numero) || numero <= 0) {
        this.erro.set('Informe o valor para calcular o troco.');
        return;
      }
      if (numero < this.totalComTaxa()) {
        this.erro.set('O valor informado é menor que o total do pedido.');
        return;
      }
      trocoPara = numero;
    }

    this.enviando.set(true);
    this.erro.set(null);

    const itens = this.cartService.items().map((item) => ({
      produtoId: item.produto.id!,
      quantidade: item.quantidade,
      removidos: item.personalizacao.removidos.map((r) => r.ingredienteId),
      adicionados: item.personalizacao.adicionados.map((a) => a.ingredienteId),
    }));

    const tipoEntrega = this.tipoEntrega() as TipoEntrega;

    this.pedidoService
      .criar({
        slug: this.contexto.slugAtual() ?? '',
        cliente: this.cliente().trim(),
        tipoEntrega,
        telefone: this.telefone().trim(),
        endereco: tipoEntrega === 'ENTREGA' ? this.endereco().trim() : undefined,
        formaPagamento: this.formaPagamento(),
        trocoPara,
        itens,
      })
      .subscribe({
        next: (pedido) => {
          this.pedidoId.set(pedido.id);
          this.pedidoSucesso.set(pedido.id.slice(0, 8).toUpperCase());
          this.cartService.clear();
          this.enviando.set(false);
          this.etapa.set('sucesso');
        },
        error: (err: HttpErrorResponse) => {
          console.error('Erro ao gravar pedido:', err);
          this.enviando.set(false);
          // Mostra o motivo real do servidor (ex.: grupo que exige escolha) em
          // vez de um texto genérico que o cliente não entende.
          this.erro.set(
            mensagemDoErro(err) ??
              'Não foi possível enviar o pedido. Tente novamente.',
          );
        },
      });
  }

  fechar(): void {
    this.isOpen.set(false);
    this.itemEmEdicao.set(null);
    this.etapa.set('carrinho');
    this.cliente.set('');
    this.telefone.set('');
    this.endereco.set('');
    this.tipoEntrega.set(null);
    this.formaPagamento.set('DINHEIRO');
    this.desejaTroco.set(false);
    this.trocoPara.set(null);
    this.erro.set(null);
    this.pedidoSucesso.set('');
    this.pedidoId.set('');
  }
}