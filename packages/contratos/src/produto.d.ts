/**
 * Como o cliente monta o produto.
 * - `PADRAO`: todo ingrediente já vem incluso e o cliente remove ou acrescenta.
 * - `MARMITA`: nada vem incluso, o cliente monta do zero e cada grupo tem um
 *   teto de porções.
 */
export type TipoProduto = 'PADRAO' | 'MARMITA';

/** Categoria do cardápio. */
export interface Categoria {
  id: string;
  nome: string;
  visivel: boolean;
  estabelecimentoId: string;
  createdAt: string;
  updatedAt: string;
}

/** Ingrediente disponível para personalização dos produtos. */
export interface Ingrediente {
  id: string;
  nome: string;
  estabelecimentoId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Seção de escolha dentro de um produto ("Proteínas", "Acompanhamentos").
 * `maximoEscolhas` conta repetição; `minimoEscolhas` é o piso obrigatório.
 */
export interface ProdutoGrupo {
  id: string;
  nome: string;
  ordem: number;
  maximoEscolhas: number;
  minimoEscolhas: number;
  produtoId: string;
}

/** Vínculo entre produto e ingrediente, com o adicional de preço. */
export interface ProdutoIngrediente {
  id: string;
  precoAdicional: number;
  produtoId: string;
  ingredienteId: string;
  grupoId: string | null;
  ingrediente: Ingrediente;
  grupo: ProdutoGrupo | null;
}

/** Produto do cardápio, com a categoria e os ingredientes personalizáveis. */
export interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  imagemUrl: string | null;
  tipo: TipoProduto;
  categoriaId: string;
  estabelecimentoId: string;
  categoria: Categoria;
  ingredientes: ProdutoIngrediente[];
  grupos: ProdutoGrupo[];
  createdAt: string;
  updatedAt: string;
}

/** Grupo de escolha no payload de criação/edição (sem `id`). */
export interface ProdutoGrupoEntrada {
  nome: string;
  maximoEscolhas?: number;
  minimoEscolhas?: number;
}

/** Vínculo de ingrediente no payload de criação/edição (grupo pelo nome). */
export interface ProdutoIngredienteEntrada {
  ingredienteId: string;
  precoAdicional?: number;
  grupo?: string;
}

/**
 * Payload de `POST /produtos` e `PATCH /produtos/:id`. Diferente de `Produto`:
 * aqui o grupo de um ingrediente é o *nome* da seção, e o `id` não existe.
 */
export interface ProdutoParaSalvar {
  nome: string;
  descricao?: string | null;
  preco: number;
  imagemUrl?: string | null;
  categoriaId: string;
  tipo?: TipoProduto;
  grupos?: ProdutoGrupoEntrada[];
  ingredientes?: ProdutoIngredienteEntrada[];
}
