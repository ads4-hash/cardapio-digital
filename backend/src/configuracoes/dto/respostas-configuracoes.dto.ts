import { ApiProperty } from '@nestjs/swagger';
import type {
  AceitandoPedidos,
  PixConfiguracao,
  TaxaEntrega,
  VisualCardapio,
} from '@projetinho/contratos';

/** `GET`/`PATCH /configuracoes/aceitando-pedidos` */
export class AceitandoPedidosDto implements AceitandoPedidos {
  @ApiProperty({
    description:
      'Quando false, o cardápio público fica bloqueado para novos pedidos.',
    example: true,
  })
  aceitandoPedidos: boolean;
}

/** `GET`/`PATCH /configuracoes/taxa-entrega` */
export class TaxaEntregaDto implements TaxaEntrega {
  @ApiProperty({
    description:
      'Taxa cobrada em entregas, em reais. 0 significa entrega grátis.',
    example: 5,
  })
  taxaEntrega: number;
}

/** `GET`/`PATCH /configuracoes/cardapio` — identidade visual do cardápio */
export class VisualCardapioDto implements VisualCardapio {
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

/** `GET`/`PATCH /configuracoes/pix` — dados para pagar com Pix */
export class PixDto implements PixConfiguracao {
  @ApiProperty({
    description: 'Tipo da chave Pix cadastrada pelo estabelecimento.',
    enum: ['CPF', 'CNPJ', 'TELEFONE', 'EMAIL', 'ALEATORIA'],
    example: 'CPF',
    nullable: true,
    type: String,
  })
  tipoChave: PixConfiguracao['tipoChave'];

  @ApiProperty({
    description: 'A própria chave Pix (valor que o cliente copia e cola).',
    example: '123.456.789-00',
    nullable: true,
    type: String,
  })
  chave: string | null;

  @ApiProperty({
    description: 'Nome do titular da conta que recebe o Pix.',
    example: 'Maria da Silva',
    nullable: true,
    type: String,
  })
  titular: string | null;

  @ApiProperty({
    description: 'Instituição/banco que emitiu a chave Pix.',
    example: 'Nubank',
    nullable: true,
    type: String,
  })
  instituicao: string | null;

  @ApiProperty({
    description:
      'URL da imagem do QR Code Pix (caminho relativo em /uploads/).',
    example: '/uploads/est-abc/1756460000000-123.png',
    nullable: true,
    type: String,
  })
  qrUrl: string | null;
}
