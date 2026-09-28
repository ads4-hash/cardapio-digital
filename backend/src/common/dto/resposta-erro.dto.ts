import { ApiProperty } from '@nestjs/swagger';

/**
 * Corpo de TODAS as respostas de erro da API, produzido pelo
 * `ErrosGlobaisFilter`. Vale para 400/401/403/404/413/429/500.
 */
export class RespostaErroDto {
  @ApiProperty({
    description: 'Código HTTP da resposta.',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Nome do status HTTP, em inglês.',
    example: 'Bad Request',
  })
  erro: string;

  @ApiProperty({
    description:
      'Mensagem em português. Na validação de DTO, vem como array com um item por campo inválido.',
    oneOf: [
      { type: 'string', example: 'E-mail ou senha inválidos.' },
      {
        type: 'array',
        items: { type: 'string' },
        example: ['senha deve ter pelo menos 6 caracteres'],
      },
    ],
  })
  mensagem: string | string[];

  @ApiProperty({
    description: 'Caminho da requisição que falhou.',
    example: '/auth/login',
  })
  caminho: string;

  @ApiProperty({
    description: 'Instante do erro, em ISO 8601.',
    example: '2026-09-28T17:00:00.000Z',
  })
  timestamp: string;
}
