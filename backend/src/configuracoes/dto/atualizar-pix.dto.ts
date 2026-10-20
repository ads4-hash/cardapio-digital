import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import type { TipoChavePix } from '@projetinho/contratos';
import { URL_IMAGEM_MENSAGEM, URL_IMAGEM_REGEX } from '../../common/imagem';

// Tipos de chave Pix aceitos (Banco Central) — espelha o contrato compartilhado
export const TIPOS_CHAVE_PIX: TipoChavePix[] = [
  'CPF',
  'CNPJ',
  'TELEFONE',
  'EMAIL',
  'ALEATORIA',
];

// Dados Pix exibidos ao cliente quando ele escolhe pagar com Pix no checkout
// (todos os campos são opcionais — PATCH de verdade)
export class AtualizarPixDto {
  /**
   * Tipo da chave Pix cadastrada. `null` limpa a configuração.
   * @example CPF
   */
  @IsOptional()
  @IsIn(TIPOS_CHAVE_PIX, {
    message:
      'Informe um tipo de chave PIX válido: CPF, CNPJ, TELEFONE, EMAIL ou ALEATORIA.',
  })
  tipoChave?: TipoChavePix | null;

  /**
   * A própria chave Pix (CPF/CNPJ/e-mail/telefone/aleatória). `null` limpa.
   * @example 123.456.789-00
   */
  @IsOptional()
  @IsString({ message: 'Informe uma chave PIX válida.' })
  @MaxLength(140, { message: 'A chave PIX é muito longa.' })
  chave?: string | null;

  /**
   * Nome do titular da conta que recebe o Pix. `null` limpa.
   * @example Maria da Silva
   */
  @IsOptional()
  @IsString({ message: 'Informe um titular válido.' })
  @MaxLength(140, { message: 'O nome do titular é muito longo.' })
  titular?: string | null;

  /**
   * Instituição/banco que emitiu a chave (ex.: Nubank). `null` limpa.
   * @example Nubank
   */
  @IsOptional()
  @IsString({ message: 'Informe uma instituição válida.' })
  @MaxLength(140, { message: 'O nome da instituição é muito longo.' })
  instituicao?: string | null;

  /**
   * URL relativa da imagem do QR Code Pix (caminho em /uploads/). `null` limpa.
   * @example /uploads/est-abc/1756460000000-123.png
   */
  @IsOptional()
  @IsString({ message: 'Informe uma URL de QR Code válida.' })
  @Matches(URL_IMAGEM_REGEX, { message: URL_IMAGEM_MENSAGEM })
  @MaxLength(300, { message: 'A URL do QR Code é muito longa.' })
  qrUrl?: string | null;
}
