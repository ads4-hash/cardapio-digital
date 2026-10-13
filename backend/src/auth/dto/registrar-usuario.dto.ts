import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SenhaForte } from '../../common/senha';

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
   * Senha de acesso, mínimo de 6 caracteres com letras e números.
   * @example senha123
   */
  @IsString()
  @SenhaForte()
  senha: string;

  /**
   * Precisa ser idêntica a `senha`.
   * @example senha123
   */
  @IsString()
  @IsNotEmpty({ message: 'Confirme a senha.' })
  confirmarSenha: string;
}
