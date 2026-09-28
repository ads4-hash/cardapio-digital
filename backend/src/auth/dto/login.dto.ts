import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  /**
   * E-mail cadastrado do administrador.
   * @example admin@pizzaria.com.br
   */
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  /**
   * Senha do administrador.
   * @example senha123
   */
  @IsString()
  @IsNotEmpty({ message: 'Informe a senha.' })
  senha: string;
}
