import { IsEmail } from 'class-validator';

export class SolicitarRecuperacaoDto {
  /**
   * E-mail cadastrado. A resposta é a mesma exista ou não a conta, para não
   * revelar quem tem cadastro.
   * @example admin@pizzaria.com.br
   */
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;
}
