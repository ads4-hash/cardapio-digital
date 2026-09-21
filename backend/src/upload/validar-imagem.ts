import { createReadStream } from 'fs';
import { stat } from 'fs/promises';

/** Extensões aceitas (e servidas) como imagem — SVG fica de fora por executar script */
const EXTENSOES_PERMITIDAS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

/** Firma (primeiros bytes) esperada para cada tipo de imagem aceito */
const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/gif': [0x47, 0x49, 0x46, 0x38],
};

export function extensaoPermitida(extensao: string): boolean {
  return EXTENSOES_PERMITIDAS.includes(extensao.toLowerCase());
}

export function extensaoDoOriginal(nomeOriginal: string): string {
  const ponto = nomeOriginal.lastIndexOf('.');
  return ponto >= 0 ? nomeOriginal.slice(ponto).toLowerCase() : '';
}

/**
 * Valida o conteúdo real do arquivo gravado no disco, comparando a assinatura
 * ("magic bytes") com o tipo declarado no upload.
 */
export async function validarConteudoImagem(
  caminho: string,
  mime: string,
): Promise<boolean> {
  if (!mime || !MAGIC_BYTES[mime]) {
    return false;
  }
  const firmasEsperadas = MAGIC_BYTES[mime];
  const qtdBytes = firmasEsperadas.length;

  const info = await stat(caminho).catch(() => null);
  if (!info || info.size < qtdBytes) {
    return false;
  }

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = createReadStream(caminho, { start: 0, end: 11 });
    stream.on('data', (chunk) => chunks.push(chunk as Buffer));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });

  const linha =
    buffer.length >= 8 ? buffer.subarray(8, 12).toString('ascii') : '';

  if (mime === 'image/webp') {
    // RIFF (4 primeiros bytes) + tamanho (4) + 'WEBP'
    return (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      linha === 'WEBP'
    );
  }

  return firmasEsperadas.every((byte, indice) => buffer[indice] === byte);
}
