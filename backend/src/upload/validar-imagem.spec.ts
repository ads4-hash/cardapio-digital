import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  extensaoDoOriginal,
  extensaoPermitida,
  validarConteudoImagem,
} from './validar-imagem';

/**
 * O upload confia em magic bytes, não no valor do cliente: uma extensão .png
 * com conteúdo JPEG não pode escapar. Testes usam arquivos de verdade no
 * tempdir com as firmas corretas.
 */
describe('validar-imagem', () => {
  let pasta: string;

  beforeEach(() => {
    pasta = mkdtempSync(join(tmpdir(), 'img-teste-'));
  });

  afterEach(() => {
    rmSync(pasta, { recursive: true, force: true });
  });

  function gravar(nome: string, bytes: Buffer): string {
    const caminho = join(pasta, nome);
    writeFileSync(caminho, bytes);
    return caminho;
  }

  it('aceita as extensões servidas e barra SVG', () => {
    expect(extensaoPermitida('.jpg')).toBe(true);
    expect(extensaoPermitida('.JPEG')).toBe(true);
    expect(extensaoPermitida('.png')).toBe(true);
    expect(extensaoPermitida('.webp')).toBe(true);
    expect(extensaoPermitida('.gif')).toBe(true);
    expect(extensaoPermitida('.svg')).toBe(false);
    expect(extensaoPermitida('.exe')).toBe(false);
  });

  it('extrai a extensão do nome original em minúsculas', () => {
    expect(extensaoDoOriginal('foto.PNG')).toBe('.png');
    expect(extensaoDoOriginal('sem_extensao')).toBe('');
    expect(extensaoDoOriginal('nome.tal.png')).toBe('.png');
  });

  it('reconhece PNG de verdade pelos primeiros bytes', async () => {
    const arquivo = gravar(
      'logo.png',
      Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]),
    );
    await expect(validarConteudoImagem(arquivo, 'image/png')).resolves.toBe(
      true,
    );
  });

  it('reconhece WebP de verdade (RIFF + WEBP)', async () => {
    const arquivo = gravar(
      'foto.webp',
      Buffer.concat([
        Buffer.from('RIFF', 'ascii'),
        Buffer.from([0x00, 0x00, 0x00, 0x00]),
        Buffer.from('WEBPVP8', 'ascii'),
      ]),
    );
    await expect(validarConteudoImagem(arquivo, 'image/webp')).resolves.toBe(
      true,
    );
  });

  it('barra conteúdo que não bate com o tipo declarado', async () => {
    const arquivo = gravar(
      'falso.png',
      Buffer.from('isto nao e uma imagem de verdade'),
    );
    await expect(validarConteudoImagem(arquivo, 'image/png')).resolves.toBe(
      false,
    );
  });

  it('barra arquivo inexistente e tipo desconhecido', async () => {
    await expect(
      validarConteudoImagem(join(pasta, 'sumido.png'), 'image/png'),
    ).resolves.toBe(false);
    await expect(
      validarConteudoImagem(join(pasta, 'x.png'), 'text/plain'),
    ).resolves.toBe(false);
  });
});
