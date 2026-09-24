import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RedefinirSenhaDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe o código de recuperação.' })
  @MaxLength(16, { message: 'Código de recuperação inválido.' })
  token: string;

  @IsString()
  @MinLength(6, { message: 'A nova senha deve ter pelo menos 6 caracteres.' })
  novaSenha: string;

  @IsString()
  @IsNotEmpty({ message: 'Confirme a nova senha.' })
  confirmarSenha: string;
}
