import { IsEmail } from 'class-validator';

export class SolicitarRecuperacaoDto {
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;
}
