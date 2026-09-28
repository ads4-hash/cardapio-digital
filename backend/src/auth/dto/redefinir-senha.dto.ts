import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RedefinirSenhaDto {
  /**
   * Código de recuperação recebido por e-mail.
   * @example 483920
   */
  @IsString()
  @IsNotEmpty({ message: 'Informe o código de recuperação.' })
  @MaxLength(16, { message: 'Código de recuperação inválido.' })
  token: string;

  /**
   * Nova senha, mínimo de 6 caracteres.
   * @example novaSenha123
   */
  @IsString()
  @MinLength(6, { message: 'A nova senha deve ter pelo menos 6 caracteres.' })
  novaSenha: string;

  /**
   * Precisa ser idêntica a `novaSenha`.
   * @example novaSenha123
   */
  @IsString()
  @IsNotEmpty({ message: 'Confirme a nova senha.' })
  confirmarSenha: string;
}
