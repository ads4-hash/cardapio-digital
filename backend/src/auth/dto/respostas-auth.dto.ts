import { ApiProperty } from '@nestjs/swagger';
import { EstabelecimentoResumoDto } from '../../common/dto/estabelecimento-resumo.dto';

/** Usuário logado, sem o hash da senha. */
export class UsuarioPublicoDto {
  @ApiProperty({ example: 'b1a2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d' })
  id: string;

  @ApiProperty({ example: 'Marina Souza' })
  nome: string;

  @ApiProperty({
    description: 'E-mail de login, sempre armazenado em minúsculas.',
    example: 'marina@exemplo.com',
  })
  email: string;

  @ApiProperty({
    type: EstabelecimentoResumoDto,
    description:
      'Estabelecimento ao qual este administrador pertence. Todo o painel opera dentro dele.',
  })
  estabelecimento: EstabelecimentoResumoDto;
}

/** Resposta de `POST /auth/registrar`, `POST /auth/login` e `PATCH /auth/me`. */
export class RespostaAuthDto {
  @ApiProperty({
    description:
      'Token JWT de acesso. Enviar como "Authorization: Bearer <token>".',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;

  @ApiProperty({ type: UsuarioPublicoDto })
  usuario: UsuarioPublicoDto;
}

/** Resposta de `GET /auth/cardapio` — nome e contato, para telas públicas. */
export class InfoCardapioDto {
  @ApiProperty({ example: 'Pizzaria do Zé' })
  nome: string;

  @ApiProperty({
    example: '+5511999999999',
    nullable: true,
    type: String,
  })
  telefone: string | null;
}

/** Resposta de `POST /auth/recuperar-senha`. */
export class RecuperacaoRespostaDto {
  @ApiProperty({
    description:
      'true quando o código foi enviado por e-mail (SMTP configurado).',
    example: true,
  })
  enviadoPorEmail: boolean;

  @ApiProperty({
    description:
      'Mensagem genérica exibida na tela. A resposta é sempre 200, mesmo para e-mails inexistentes, para não revelar quais contas existem.',
    example:
      'Enviamos um e-mail com o código de recuperação. Ele é válido por 30 minutos.',
  })
  mensagem: string;

  @ApiProperty({
    description:
      'Código de recuperação. Só vem preenchido fora de produção e sem SMTP configurado.',
    example: 'A1B2C3D4',
    required: false,
  })
  token?: string;

  @ApiProperty({
    description: 'Validade do código, em ISO 8601 (30 minutos).',
    example: '2026-09-28T17:30:00.000Z',
    required: false,
  })
  expiraEm?: string;
}

/** Resposta de `POST /auth/redefinir-senha` e `PATCH /auth/me`. */
export class MensagemDto {
  @ApiProperty({
    description:
      'Confirmação em texto, já pronta para exibir na tela. Endpoints que não têm payload próprio devolvem só isto.',
    example: 'Senha redefinida com sucesso.',
  })
  mensagem: string;
}
