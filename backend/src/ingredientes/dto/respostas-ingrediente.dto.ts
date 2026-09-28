import { ApiProperty } from '@nestjs/swagger';

/** Ingrediente disponível para personalização dos produtos. */
export class IngredienteDto {
  @ApiProperty({ example: 'd1e2f3a4-b5c6-4d7e-8f90-1a2b3c4d5e6f' })
  id: string;

  @ApiProperty({ example: 'Queijo extra' })
  nome: string;

  @ApiProperty({ description: 'Estabelecimento dono do ingrediente.' })
  estabelecimentoId: string;

  @ApiProperty({ example: '2026-09-01T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-09-20T18:30:00.000Z' })
  updatedAt: string;
}
