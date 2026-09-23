import {
  IsHexColor,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

// Personalização visual do cardápio público (todos os campos são opcionais)
export class AtualizarCardapioDto {
  // Cor principal da marca (hexadecimal, ex.: #f43f5e). null remove a cor
  @IsOptional()
  @IsHexColor({
    message: 'Informe uma cor válida no formato hexadecimal (ex.: #f43f5e).',
  })
  cor?: string | null;

  // Tema padrão do cardápio: auto segue a preferência do dispositivo/usuário
  @IsOptional()
  @IsIn(['claro', 'escuro', 'auto'], {
    message: 'Informe um tema válido: claro, escuro ou auto.',
  })
  tema?: 'claro' | 'escuro' | 'auto';

  // URL da logo (relativa, ex.: /uploads/abc.png). null remove a logo
  @IsOptional()
  @IsString({ message: 'Informe uma URL de logo válida.' })
  @MaxLength(300, { message: 'A URL da logo é muito longa.' })
  logoUrl?: string | null;

  // URL da imagem de capa/topo do cardápio (relativa, ex.: /uploads/banner.png).
  // null remove a capa
  @IsOptional()
  @IsString({ message: 'Informe uma URL de capa válida.' })
  @MaxLength(300, { message: 'A URL da capa é muito longa.' })
  capaUrl?: string | null;
}
