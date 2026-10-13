import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { SenhaForte } from '../../common/senha';

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
   * Nova senha, mínimo de 6 caracteres com letras e números.
   * @example novaSenha123
   */
  @IsString()
  @SenhaForte()
  novaSenha: string;

  /**
   * Precisa ser idêntica a `novaSenha`.
   * @example novaSenha123
   */
  @IsString()
  @IsNotEmpty({ message: 'Confirme a nova senha.' })
  confirmarSenha: string;
}
