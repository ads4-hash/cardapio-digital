import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Modo de montagem do produto.
 * - `PADRAO`: todo ingrediente já vem incluso (quantidade 1) e o cliente
 *   remove ou acrescenta. É o comportamento das pizzas.
 * - `MARMITA`: nada vem incluso, o cliente monta o pedido do zero e os grupos
 *   definem o teto de escolhas.
 */
export const TIPO_PRODUTO = ['PADRAO', 'MARMITA'] as const;
export type TipoProduto = (typeof TIPO_PRODUTO)[number];

export class ProdutoGrupoDto {
  /**
   * Nome da seção, como aparece no cardápio. Agrupamentos com o mesmo nome
   * dentro do produto são unidos.
   * @example Proteínas
   */
  @IsString()
  @IsNotEmpty({ message: 'O nome do grupo é obrigatório.' })
  @MaxLength(60, { message: 'O nome do grupo deve ter no máximo 60 caracteres.' })
  nome: string;

  /**
   * Teto de porções que o cliente pode somar no grupo. Conta repetição: com
   * `2`, dá para pedir a mesma proteína duas vezes. Omitir significa 99.
   * @example 2
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O máximo de escolhas deve ser um número inteiro.' })
  @Min(1, { message: 'O máximo de escolhas deve ser no mínimo 1.' })
  @Max(99, { message: 'O máximo de escolhas deve ser no máximo 99.' })
  maximoEscolhas?: number;
}

export class ProdutoIngredienteDto {
  /**
   * Ingrediente a ser ligado ao produto. Precisa já existir em
   * `POST /ingredientes`.
   * @example d1e2f3a4-b5c6-4d7e-8f90-1a2b3c4d5e6f
   */
  @IsString()
  @IsNotEmpty({ message: 'O id do ingrediente é obrigatório.' })
  ingredienteId: string;

  /**
   * Quanto o cliente paga a mais por escolher este ingrediente. `0` deixa
   * gratuito. Omitir também significa gratuito.
   *
   * Atenção em produtos `MARMITA`: o preço base da marmita já inclui o
   * item, então use `0` para o que está incluso e reserve o campo para
   * acréscimo real (ovo, bacon, queijo extra).
   * @example 4.5
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'O preço adicional deve ser um número.' })
  @Min(0, { message: 'O preço adicional não pode ser negativo.' })
  precoAdicional?: number;

  /**
   * Nome do grupo ao qual o ingrediente pertence. Precisa constar em
   * `grupos`. Omitir deixa o ingrediente solto, sem teto de escolhas.
   * @example Proteínas
   */
  @IsOptional()
  @IsString()
  @MaxLength(60, { message: 'O nome do grupo deve ter no máximo 60 caracteres.' })
  grupo?: string;
}

export class CreateProdutoDto {
  /**
   * Nome do produto, como aparece no cardápio.
   * @example Pizza Margherita
   */
  @IsString()
  @IsNotEmpty({ message: 'O nome do produto é obrigatório.' })
  @MaxLength(100, {
    message: 'O nome do produto deve ter no máximo 100 caracteres.',
  })
  nome: string;

  /**
   * Texto livre abaixo do nome e do preço.
   * @example Molho de tomate, mussarela e manjericão.
   */
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'A descrição deve ter no máximo 500 caracteres.' })
  descricao?: string;

  /**
   * Preço base em reais, antes de qualquer adicional.
   * @example 45.9
   */
  @Type(() => Number)
  @IsNumber({}, { message: 'O preço deve ser um número.' })
  @Min(0, { message: 'O preço não pode ser negativo.' })
  preco: number;

  /**
   * Caminho da imagem devolvido pelo `POST /upload`. Precisa ser relativo,
   * começando em `/uploads/` — o frontend prefixa a URL da API.
   * @example /uploads/1756460000000-123456789.png
   */
  @IsOptional()
  @IsString()
  @Matches(/^\/uploads\/[a-zA-Z0-9._-]+$/, {
    message: 'A imagem deve ser um caminho relativo em /uploads/.',
  })
  imagemUrl?: string;

  /**
   * Categoria onde o produto aparece. Precisa já existir em
   * `POST /categorias`.
   * @example c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f
   */
  @IsString()
  @IsNotEmpty({ message: 'A categoria é obrigatória.' })
  categoriaId: string;

  /**
   * Como o cliente monta este produto. `PADRAO` mantém o comportamento atual,
   * em que todo ingrediente vem incluso. `MARMITA` faz o cliente escolher do
   * zero, respeitando o teto de cada grupo.
   */
  @IsOptional()
  @IsIn(TIPO_PRODUTO, {
    message: `O tipo deve ser ${TIPO_PRODUTO.join(' ou ')}.`,
  })
  tipo?: TipoProduto;

  /**
   * Seções de escolha do produto, com o teto de porções de cada uma. Grupos
   * sem nenhum ingrediente ligado são ignorados, para não aparecer um
   * cabeçalho vazio no cardápio.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ProdutoGrupoDto)
  grupos?: ProdutoGrupoDto[];

  /**
   * Ingredientes que o cliente pode adicionar a este produto, com o adicional
   * de preço de cada um. É o que define a personalização do item.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ProdutoIngredienteDto)
  ingredientes?: ProdutoIngredienteDto[];
}
