import {
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ehMontagem } from '../../services/produto.service';
import type {
  Produto,
  ProdutoIngrediente,
  ProdutoGrupo,
} from '../../models/produto.model';
import { CartService } from '../../services/cart.service';
import type { CartItem } from '../../models/cart.model';
import { gruposOrdenados } from '../../utils/grupos';

interface EstadoIngrediente {
  vinculo: ProdutoIngrediente;
  quantidade: number;
}

@Component({
  selector: 'app-personalizacao-produto',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './personalizacao-produto.component.html',
  styleUrls: ['./personalizacao-produto.component.css'],
})
export class PersonalizacaoProdutoComponent {
  produto = input.required<Produto>();
  // Informado quando o modal é aberto para corrigir um item já no carrinho.
  itemEmEdicao = input<CartItem | null>(null);
  fecharEvento = output<void>();

  private readonly cartService = inject(CartService);

  ingredientes = signal<EstadoIngrediente[]>([]);
  quantidade = signal(1);

  constructor() {
    effect(() => {
      const vinculos = this.produto()?.ingredientes ?? [];
      const item = this.itemEmEdicao();
      const montagem = this.montagem();

      // Ao corrigir, o modal abre no estado que já está no carrinho: os
      // removidos voltam a 0 e cada adicional soma uma cópia à base.
      const removidos = new Set(
        item?.personalizacao.removidos.map((r) => r.ingredienteId) ?? [],
      );
      const extras = (item?.personalizacao.adicionados ?? []).reduce<
        Record<string, number>
      >((acc, a) => {
        acc[a.ingredienteId] = (acc[a.ingredienteId] ?? 0) + 1;
        return acc;
      }, {});

      this.ingredientes.set(
        vinculos.map((vinculo) => ({
          vinculo,
          // Em montagem nada vem incluso: a quantidade é só o que o cliente
          // escolheu. Em produto comum todo ingrediente começa em 1 e cópias
          // extras podem ser adicionadas quando houver valor agregado.
          quantidade: montagem
            ? (extras[vinculo.ingredienteId] ?? 0)
            : removidos.has(vinculo.ingredienteId)
              ? 0
              : 1 + (extras[vinculo.ingredienteId] ?? 0),
        })),
      );
      this.quantidade.set(item?.quantidade ?? 1);
    });
  }

  // Produto de montagem: o cliente escolhe do zero, respeitando o teto de cada
  // grupo. Produto comum mantém o comportamento de remover/acrescentar.
  montagem(): boolean {
    return ehMontagem(this.produto());
  }

  // Seções de escolha do produto, na ordem em que o cardápio apresenta.
  gruposDoProduto(): ProdutoGrupo[] {
    return gruposOrdenados(this.produto()?.grupos);
  }

  // Ingredientes que pertencem a um grupo. O vínculo vem por id (grupoId); o
  // nome serve de reserva para quando a API não trouxer o id preenchido.
  private pertenceAoGrupo(ing: EstadoIngrediente, grupo: ProdutoGrupo): boolean {
    if (ing.vinculo.grupoId) return ing.vinculo.grupoId === grupo.id;
    return ing.vinculo.grupo?.nome === grupo.nome;
  }

  ingredientesDoGrupo(grupo: ProdutoGrupo): EstadoIngrediente[] {
    return this.ingredientes().filter((i) => this.pertenceAoGrupo(i, grupo));
  }

  // Ingredientes sem grupo: ficam soltos, sem teto de porções.
  ingredientesSoltos(): EstadoIngrediente[] {
    const grupos = this.gruposDoProduto();
    return this.ingredientes().filter(
      (i) => !grupos.some((g) => this.pertenceAoGrupo(i, g)),
    );
  }

  // Porções já escolhidas no grupo. A repetição conta: pedir duas vezes a mesma
  // proteína são duas porções, tal como a validação do servidor considera.
  escolhidosNoGrupo(grupo: ProdutoGrupo): number {
    return this.ingredientesDoGrupo(grupo).reduce(
      (acc, i) => acc + i.quantidade,
      0,
    );
  }

  grupoCheio(grupo: ProdutoGrupo): boolean {
    return this.escolhidosNoGrupo(grupo) >= grupo.maximoEscolhas;
  }

  // Grupo obrigatório (minimoEscolhas > 0) que ainda não atingiu o piso.
  grupoAbaixoDoMinimo(grupo: ProdutoGrupo): boolean {
    return (
      grupo.minimoEscolhas > 0 &&
      this.escolhidosNoGrupo(grupo) < grupo.minimoEscolhas
    );
  }

  // Grupos que ainda precisam de escolha. Enquanto houver algum, o item não
  // pode ir para o carrinho: o servidor recusaria o pedido no checkout.
  private gruposFaltando(): ProdutoGrupo[] {
    return this.gruposDoProduto().filter((g) => this.grupoAbaixoDoMinimo(g));
  }

  podeAdicionar(): boolean {
    return this.gruposFaltando().length === 0;
  }

  // Explica o que falta para o cliente poder adicionar (ex.: "escolha 1 porção
  // em \"Sabores\""), em vez de só desabilitar o botão sem motivo.
  mensagemFaltando(): string | null {
    const faltando = this.gruposFaltando();
    if (faltando.length === 0) return null;

    const partes = faltando.map((g) => {
      const restam = g.minimoEscolhas - this.escolhidosNoGrupo(g);
      const unidade = restam === 1 ? 'porção' : 'porções';
      return `${restam} ${unidade} em "${g.nome}"`;
    });

    return `Antes de adicionar, escolha ${partes.join(' e ')}.`;
  }

  // Teto do grupo, sem contar o próprio ingrediente que se quer somar: assim dá
  // para desmarcar a última porção já escolhida.
  estourouGrupo(ing: EstadoIngrediente): boolean {
    if (!this.montagem()) return false;
    const grupo = this.grupoDe(ing);
    if (!grupo) return false;
    const outras = this.escolhidosNoGrupo(grupo) - ing.quantidade;
    return outras >= grupo.maximoEscolhas;
  }

  private grupoDe(ing: EstadoIngrediente): ProdutoGrupo | undefined {
    return this.gruposDoProduto().find((g) => this.pertenceAoGrupo(ing, g));
  }

  // Distingue "adicionar ao carrinho" de "salvar a correção do item"
  editando(): boolean {
    return this.itemEmEdicao() !== null;
  }

  aumentarQuantidade(): void {
    this.quantidade.update((q) => q + 1);
  }

  diminuirQuantidade(): void {
    this.quantidade.update((q) => Math.max(1, q - 1));
  }

  // Ingrediente não incluso (removido pelo cliente: quantidade zerada)
  removido(ing: EstadoIngrediente): boolean {
    return !this.montagem() && ing.quantidade === 0;
  }

  // Há cópias extras além do padrão incluso (lembrando que todo ingrediente
  // começa em 1)
  adicional(ing: EstadoIngrediente): boolean {
    return ing.quantidade > 1;
  }

  // Quantas cópias deste ingrediente vão para a lista de "adicionados" enviada
  // ao servidor. Em montagem não há cópia base: cada escolha é uma adição.
  copias(ing: EstadoIngrediente): number {
    return this.montagem() ? ing.quantidade : Math.max(0, ing.quantidade - 1);
  }

  // O "+" só fica indisponível no teto de 99 ou quando somar estouraria o
  // teto do grupo. Ingrediente gratuito (`precoAdicional: 0`) soma livremente:
  // cada cópia a mais não muda o preço, então o cliente leva quantas quiser.
  naoPodeSomar(ing: EstadoIngrediente): boolean {
    if (ing.quantidade >= 99) return true;
    if (this.montagem()) return this.estourouGrupo(ing);
    return false;
  }

  precoTotal(): number {
    const base = this.produto()?.preco ?? 0;
    // Em montagem cada porção escolhida é cobrada; em produto comum só as
    // cópias extras além da 1ª já inclusa no produto.
    const extras = this.ingredientes().reduce(
      (acc, i) =>
        acc + this.copias(i) * (i.vinculo.precoAdicional ?? 0),
      0,
    );
    return base + extras;
  }

  aumentar(ing: EstadoIngrediente): void {
    if (this.naoPodeSomar(ing)) return;
    this.ingredientes.update((lista) =>
      lista.map((i) =>
        i.vinculo.ingredienteId === ing.vinculo.ingredienteId
          ? { ...i, quantidade: Math.min(i.quantidade + 1, 99) }
          : i,
      ),
    );
  }

// Em montagem não há "cópia base" a preservar: dar "−" sempre volta uma
  // porção escolhida, para o cliente poder refazer a monta.
  diminuir(ing: EstadoIngrediente): void {
    this.ingredientes.update((lista) =>
      lista.map((i) =>
        i.vinculo.ingredienteId === ing.vinculo.ingredienteId
          ? { ...i, quantidade: Math.max(0, i.quantidade - 1) }
          : i,
      ),
    );
  }

  adicionar(): void {
    const produto = this.produto();
    if (!produto) return;

    // Rede de segurança: se algum grupo obrigatório ficou incompleto, não deixa
    // o item entrar no carrinho (o botão já fica desabilitado, mas o Enter ou um
    // clique programático não podem furar a regra).
    if (!this.podeAdicionar()) return;

    // "Sem": ingredientes base removidos (quantidade zerada). Não existe em
    // montagem — lá o cliente apenas escolhe o que quer, sem remover.
    const removidos = this.montagem()
      ? []
      : this.ingredientes()
          .filter((i) => this.removido(i))
          .map((i) => ({
            ingredienteId: i.vinculo.ingredienteId,
            nome: i.vinculo.ingrediente!.nome,
            preco: 0,
          }));

    // "Adicionados": uma entrada por porção escolhida, repetição incluída. O
    // servidor usa esta lista para conferir o teto de cada grupo.
    const adicionados = this.ingredientes()
      .filter((i) => this.copias(i) > 0)
      .flatMap((i) =>
        Array.from(
          { length: this.copias(i) },
          () => ({
            ingredienteId: i.vinculo.ingredienteId,
            nome: i.vinculo.ingrediente!.nome,
            preco: i.vinculo.precoAdicional ?? 0,
          }),
        ),
      );

    const item = this.itemEmEdicao();
    if (item) {
      // Correção vinda do carrinho: substitui o item, não cria outro.
      this.cartService.atualizarItem(
        item.uid,
        this.quantidade(),
        removidos,
        adicionados,
      );
    } else {
      this.cartService.addPersonalizado(
        produto,
        this.quantidade(),
        removidos,
        adicionados,
      );
    }
    this.fechar();
  }

  fechar(): void {
    this.ingredientes.set([]);
    this.quantidade.set(1);
    this.fecharEvento.emit();
  }
}
