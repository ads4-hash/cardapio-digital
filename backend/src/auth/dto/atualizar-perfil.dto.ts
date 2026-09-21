import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

// Mesmos campos do cadastro: nome, e-mail e novas senha/confirmação
export class AtualizarPerfilDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe um nome de usuário.' })
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message:
      'O nome de usuário só pode conter letras, números, ponto, hífen ou sublinhado.',
  })
  nome: string;

  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres.' })
  senha: string;

  @IsString()
  @IsNotEmpty({ message: 'Confirme a senha.' })
  confirmarSenha: string;
}
