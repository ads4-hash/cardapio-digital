import { ApiProperty } from '@nestjs/swagger';
import { CategoriaDto } from '../../categorias/dto/respostas-categoria.dto';
import { IngredienteDto } from '../../ingredientes/dto/respostas-ingrediente.dto';

/**
 * Seção de escolha dentro do produto.
 *
 * Sufixo `Resposta` porque o DTO de entrada com o mesmo nome
 * (`ProdutoGrupoDto` em `create-produto.dto.ts`) só leva `nome`,
 * `maximoEscolhas` e `minimoEscolhas`, e o `id` não faz sentido no payload de
 * criação.
 */
export class ProdutoGrupoRespostaDto {
  @ApiProperty({ example: 'b8a7c6d5-e4f3-4a2b-9c1d-0e9f8a7b6c5d' })
  id: string;

  @ApiProperty({
    description: 'Nome da seção, como aparece no cardápio.',
    example: 'Proteínas',
  })
  nome: string;

  @ApiProperty({ description: 'Posição da seção na tela.', example: 0 })
  ordem: number;

  @ApiProperty({
    description:
      'Teto de porções somadas no grupo. Conta repetição, então 2 permite pedir a mesma proteína duas vezes.',
    example: 2,
  })
  maximoEscolhas: number;

  @ApiProperty({
    description:
      'Piso de porções do grupo. Com 1 o cliente é obrigado a escolher antes de enviar o pedido.',
    example: 1,
  })
  minimoEscolhas: number;

  @ApiProperty({ example: 'f3a4b5c6-d7e8-4f90-a012-3c4d5e6f7081' })
  produtoId: string;
}

/**
 * Vínculo entre produto e ingrediente, com o adicional de preço.
 *
 * Sufixo `Resposta` porque o DTO de entrada do mesmo vínculo
 * (`ProdutoIngredienteDto` em `create-produto.dto.ts`) só leva
 * `ingredienteId`, `precoAdicional` e `grupo`; nomes iguais se sobrescrevem no
 * índice de schemas do Swagger.
 */
export class ProdutoIngredienteRespostaDto {
  @ApiProperty({ example: 'e2f3a4b5-c6d7-4e8f-9a01-2b3c4d5e6f70' })
  id: string;

  @ApiProperty({
    description:
      'Valor somado ao preço do produto quando o cliente escolhe o ingrediente.',
    example: 4.5,
  })
  precoAdicional: number;

  @ApiProperty({ example: 'a1b2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d' })
  produtoId: string;

  @ApiProperty({ example: 'd1e2f3a4-b5c6-4d7e-8f90-1a2b3c4d5e6f' })
  ingredienteId: string;

  @ApiProperty({ type: IngredienteDto })
  ingrediente: IngredienteDto;

  @ApiProperty({
    type: ProdutoGrupoRespostaDto,
    nullable: true,
    description:
      'Grupo de escolha ao qual o ingrediente pertence. Nulo quando o ingrediente é solto, sem teto de porções.',
  })
  grupo: ProdutoGrupoRespostaDto | null;
}

/** Produto do cardápio, com a categoria e os ingredientes personalizáveis. */
export class ProdutoDto {
  @ApiProperty({ example: 'f3a4b5c6-d7e8-4f90-a012-3c4d5e6f7081' })
  id: string;

  @ApiProperty({ example: 'Pizza Margherita' })
  nome: string;

  @ApiProperty({
    example: 'Molho de tomate, mussarela e manjericão.',
    nullable: true,
    type: String,
  })
  descricao: string | null;

  @ApiProperty({ description: 'Preço base, em reais.', example: 45.9 })
  preco: number;

  @ApiProperty({
    description:
      'URL da imagem. Caminhos relativos (/uploads/...) são resolvidos pelo frontend.',
    example: '/uploads/1756460000000-123456789.png',
    nullable: true,
    type: String,
  })
  imagemUrl: string | null;

  @ApiProperty({
    description:
      'Modo de montagem. `PADRAO` traz todo ingrediente incluso e o cliente remove ou acrescenta. `MARMITA` começa zerado e o cliente monta do zero, respeitando o teto de cada grupo.',
    enum: ['PADRAO', 'MARMITA'],
    example: 'PADRAO',
  })
  tipo: string;

  @ApiProperty({ example: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f' })
  categoriaId: string;

  @ApiProperty({ description: 'Estabelecimento dono do produto.' })
  estabelecimentoId: string;

  @ApiProperty({ type: CategoriaDto })
  categoria: CategoriaDto;

  @ApiProperty({
    type: [ProdutoIngredienteRespostaDto],
    description:
      'Ingredientes que o cliente pode adicionar (com adicional de preço) ou remover.',
  })
  ingredientes: ProdutoIngredienteRespostaDto[];

  @ApiProperty({
    type: [ProdutoGrupoRespostaDto],
    description:
      'Seções de escolha do produto, com o teto de porções de cada uma. Vazio em produtos do tipo `PADRAO` sem agrupamento.',
  })
  grupos: ProdutoGrupoRespostaDto[];

  @ApiProperty({ example: '2026-09-01T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-09-20T18:30:00.000Z' })
  updatedAt: string;
}
