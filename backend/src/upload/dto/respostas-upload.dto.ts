import { ApiProperty } from '@nestjs/swagger';

/** `POST /upload` — caminho público da imagem gravada. */
export class UploadRespostaDto {
  @ApiProperty({
    description:
      'Caminho da imagem no servidor. Use como imagemUrl do produto, prefixando a URL da API.',
    example: '/uploads/1756460000000-123456789.png',
  })
  url: string;
}
