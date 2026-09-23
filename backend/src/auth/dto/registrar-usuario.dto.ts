import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegistrarUsuarioDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe um nome.' })
  @MaxLength(80, { message: 'O nome deve ter no máximo 80 caracteres.' })
  nome: string;

  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'O telefone deve ter no máximo 20 caracteres.' })
  telefone?: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres.' })
  senha: string;

  @IsString()
  @IsNotEmpty({ message: 'Confirme a senha.' })
  confirmarSenha: string;
}
