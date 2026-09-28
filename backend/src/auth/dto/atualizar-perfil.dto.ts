import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// Edição do perfil: nome, e-mail e (opcionalmente) nova senha. A senha só é
// alterada quando informada; deixar em branco mantém a senha atual.
export class AtualizarPerfilDto {
  /**
   * Nome exibido no painel.
   * @example Maria Souza
   */
  @IsString()
  @IsNotEmpty({ message: 'Informe um nome.' })
  @MaxLength(80, { message: 'O nome deve ter no máximo 80 caracteres.' })
  nome: string;

  /**
   * E-mail de acesso. Trocar o e-mail exige `senhaAtual`.
   * @example maria@pizzaria.com.br
   */
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  /**
   * Telefone de contato, usado no cabeçalho do cardápio.
   * @example (11) 98888-7777
   */
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'O telefone deve ter no máximo 20 caracteres.' })
  telefone?: string;

  /**
   * Nova senha. Omitir mantém a senha atual. Trocá-la exige `senhaAtual`.
   * @example novaSenha123
   */
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres.' })
  senha?: string;

  /**
   * Precisa bater com `senha` quando a senha está sendo trocada.
   * @example novaSenha123
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Confirme a senha.' })
  confirmarSenha?: string;

  /**
   * Senha atual do administrador. Obrigatória para trocar o e-mail de acesso ou
   * a senha — sem ela, quem tivesse um token roubado tomaria a conta de uma
   * vez. Não é exigida para alterar apenas nome e telefone.
   * @example senhaAtual123
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Informe a senha atual.' })
  senhaAtual?: string;
}
