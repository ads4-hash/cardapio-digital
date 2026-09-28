import { ApiProperty } from '@nestjs/swagger';

/** `GET`/`PATCH /configuracoes/aceitando-pedidos` */
export class AceitandoPedidosDto {
  @ApiProperty({
    description:
      'Quando false, o cardápio público fica bloqueado para novos pedidos.',
    example: true,
  })
  aceitandoPedidos: boolean;
}

/** `GET`/`PATCH /configuracoes/taxa-entrega` */
export class TaxaEntregaDto {
  @ApiProperty({
    description:
      'Taxa cobrada em entregas, em reais. 0 significa entrega grátis.',
    example: 5,
  })
  taxaEntrega: number;
}

/** `GET`/`PATCH /configuracoes/cardapio` — identidade visual do cardápio */
export class VisualCardapioDto {
  @ApiProperty({
    description: 'Cor principal da marca, em hexadecimal.',
    example: '#f43f5e',
    nullable: true,
    type: String,
  })
  cor: string | null;

  @ApiProperty({
    description: 'URL da logo mostrada no topo do cardápio.',
    example: '/uploads/1756460000000-123456789.png',
    nullable: true,
    type: String,
  })
  logoUrl: string | null;

  @ApiProperty({
    description: 'URL da imagem de capa do cardápio.',
    example: '/uploads/1756460000000-987654321.jpg',
    nullable: true,
    type: String,
  })
  capaUrl: string | null;

  @ApiProperty({
    description:
      'Tema do cardápio. "auto" segue a preferência de tema do dispositivo do cliente.',
    enum: ['claro', 'escuro', 'auto'],
    example: 'auto',
  })
  tema: 'claro' | 'escuro' | 'auto';
}
