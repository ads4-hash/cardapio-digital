import { ApiProperty } from '@nestjs/swagger';

/**
 * Estabelecimento (tenant) como aparece dentro das respostas de `auth`:
 * sem timestamps e sem as coleções de produtos/pedidos.
 */
export class EstabelecimentoResumoDto {
  @ApiProperty({
    description: 'UUID do estabelecimento.',
    example: '8f2c1a90-4b3e-4c7d-9e11-2a5b6c7d8e90',
  })
  id: string;

  @ApiProperty({
    description: 'Nome do estabelecimento.',
    example: 'Pizzaria do Zé',
  })
  nome: string;

  @ApiProperty({
    description:
      'Identificador usado na URL pública do cardápio: /cardapio/:slug.',
    example: 'pizzaria-do-ze',
  })
  slug: string;

  @ApiProperty({
    description: 'Telefone de contato do estabelecimento.',
    example: '+5511999999999',
    nullable: true,
    type: String,
  })
  telefone: string | null;
}
