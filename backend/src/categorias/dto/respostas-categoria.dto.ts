import { ApiProperty } from '@nestjs/swagger';

/** Categoria do cardápio. */
export class CategoriaDto {
  @ApiProperty({ example: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f' })
  id: string;

  @ApiProperty({ example: 'Pizzas' })
  nome: string;

  @ApiProperty({
    description:
      'Quando false, a categoria (e seus produtos) não aparece para o cliente no cardápio público.',
    example: true,
  })
  visivel: boolean;

  @ApiProperty({ description: 'Estabelecimento dono da categoria.' })
  estabelecimentoId: string;

  @ApiProperty({ example: '2026-09-01T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-09-20T18:30:00.000Z' })
  updatedAt: string;
}
