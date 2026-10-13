// Interface representando a entidade do Categoria
export interface Categoria {
  id: string;
  nome: string;
  visivel?: boolean;
  produtos?: Produto[];
}

/**
 * Como o cliente monta o produto.
 * - `PADRAO`: todo ingrediente já vem incluso e o cliente remove ou acrescenta.
 * - `MARMITA`: nada vem incluso, o cliente monta do zero e cada grupo tem um
 *   teto de porções.
 */
export type TipoProduto = 'PADRAO' | 'MARMITA';

// Seção de escolha dentro de um produto ("Proteínas", "Acompanhamentos").
// maximoEscolhas limita quantas porções o cliente pode somar no grupo, contando
// repetição: 2 permite escolher a mesma proteína duas vezes.
// minimoEscolhas é o piso: com 1 o cliente é obrigado a escolher no grupo antes
// de mandar o pedido. Nunca passa do maximoEscolhas.
export interface ProdutoGrupo {
  id?: string;
  nome: string;
  ordem?: number;
  maximoEscolhas: number;
  minimoEscolhas: number;
}

// Interface representando o vínculo de um ingrediente a um produto
export interface ProdutoIngrediente {
  id?: string;
  precoAdicional: number;
  ingredienteId: string;
  ingrediente?: Ingrediente;
  // Grupo de escolha a que o ingrediente pertence. Nulo = ingrediente solto,
  // sem teto de porções.
  grupoId?: string | null;
  grupo?: ProdutoGrupo | null;
}

// Interface representando a entidade do Ingrediente
export interface Ingrediente {
  id: string;
  nome: string;
  produtos?: ProdutoIngrediente[];
}

// Interface representando a entidade do Produto
export interface Produto {
  id?: string;
  nome: string;
  descricao?: string;
  preco: number;
  imagemUrl?: string | null;
  categoriaId: string;
  categoria?: Categoria;
  categoriaNome?: string;
  tipo?: TipoProduto;
  grupos?: ProdutoGrupo[];
  ingredientes?: ProdutoIngrediente[];
}

// Payload de `POST /produtos` e `PATCH /produtos/:id`. Não é o mesmo formato
// de `Produto`: aqui o grupo de um ingrediente é o *nome* da seção, enquanto na
// resposta da API ele vem como objeto.
export interface ProdutoParaSalvar {
  nome: string;
  descricao?: string | null;
  preco: number;
  imagemUrl?: string | null;
  categoriaId: string;
  tipo?: TipoProduto;
  grupos?: { nome: string; maximoEscolhas: number; minimoEscolhas: number }[];
  ingredientes?: {
    ingredienteId: string;
    precoAdicional: number;
    grupo?: string;
  }[];
}
