import {
  IsHexColor,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { URL_IMAGEM_MENSAGEM, URL_IMAGEM_REGEX } from '../../common/imagem';

// Personalização visual do cardápio público (todos os campos são opcionais)
export class AtualizarCardapioDto {
  /**
   * Cor principal da marca (hexadecimal, ex.: #f43f5e). `null` remove a cor.
   * @example #f43f5e
   */
  @IsOptional()
  @IsHexColor({
    message: 'Informe uma cor válida no formato hexadecimal (ex.: #f43f5e).',
  })
  cor?: string | null;

  /**
   * Tema padrão do cardápio: `auto` segue a preferência do dispositivo/usuário.
   * @example auto
   */
  @IsOptional()
  @IsIn(['claro', 'escuro', 'auto'], {
    message: 'Informe um tema válido: claro, escuro ou auto.',
  })
  tema?: 'claro' | 'escuro' | 'auto';

  /**
   * URL da logo (relativa, ex.: /uploads/abc.png). `null` remove a logo.
   * @example /uploads/1756460000000-123456789.png
   */
  @IsOptional()
  @IsString({ message: 'Informe uma URL de logo válida.' })
  @Matches(URL_IMAGEM_REGEX, { message: URL_IMAGEM_MENSAGEM })
  @MaxLength(300, { message: 'A URL da logo é muito longa.' })
  logoUrl?: string | null;

  /**
   * URL da imagem de capa/topo do cardápio (relativa, ex.: /uploads/banner.png).
   * `null` remove a capa.
   * @example /uploads/1756460000000-987654321.png
   */
  @IsOptional()
  @IsString({ message: 'Informe uma URL de capa válida.' })
  @Matches(URL_IMAGEM_REGEX, { message: URL_IMAGEM_MENSAGEM })
  @MaxLength(300, { message: 'A URL da capa é muito longa.' })
  capaUrl?: string | null;
}
