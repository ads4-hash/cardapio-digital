import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegistrarUsuarioDto {
  /**
   * Nome do estabelecimento, que vira o título do cardápio.
   * @example Pizzaria do Zé
   */
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome do estabelecimento.' })
  @MaxLength(120, {
    message: 'O nome do estabelecimento deve ter no máximo 120 caracteres.',
  })
  nomeEstabelecimento: string;

  /**
   * Nome do administrador responsável.
   * @example Zé da Silva
   */
  @IsString()
  @IsNotEmpty({ message: 'Informe um nome.' })
  @MaxLength(80, { message: 'O nome deve ter no máximo 80 caracteres.' })
  nome: string;

  /**
   * E-mail de acesso do administrador.
   * @example ze@pizzaria.com.br
   */
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  /**
   * Telefone exibido para o cliente no cardápio.
   * @example (11) 98888-7777
   */
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'O telefone deve ter no máximo 20 caracteres.' })
  telefone?: string;

  /**
   * Senha de acesso, mínimo de 6 caracteres.
   * @example senha123
   */
  @IsString()
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres.' })
  senha: string;

  /**
   * Precisa ser idêntica a `senha`.
   * @example senha123
   */
  @IsString()
  @IsNotEmpty({ message: 'Confirme a senha.' })
  confirmarSenha: string;
}
