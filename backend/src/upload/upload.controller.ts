import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { unlinkSync } from 'fs';
import { resolve } from 'path';
import { AuthGuard } from '../auth/auth.guard';
import {
  extensaoDoOriginal,
  extensaoPermitida,
  validarConteudoImagem,
} from './validar-imagem';

/** Tipos de imagem aceitos no upload */
const MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
/** Tamanho máximo de arquivo (5 MB) */
const MAX_SIZE = 5 * 1024 * 1024;

@Controller('upload')
export class UploadController {
  @UseGuards(AuthGuard)
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const ext = extensaoPermitida(extname(file.originalname))
            ? extname(file.originalname).toLowerCase()
            : '';
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // 1ª barreira: tipo declarado + extensão (sem SVG e sem executáveis)
        const extensao = extensaoDoOriginal(file.originalname);
        if (
          !MIME_TYPES.includes(file.mimetype) ||
          !extensaoPermitida(extensao)
        ) {
          cb(
            new BadRequestException(
              'Somente arquivos de imagem (JPG, PNG, WEBP, GIF) são permitidos.',
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
      limits: { fileSize: MAX_SIZE },
    }),
  )
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado.');
    }

    // 2ª barreira: confere o conteúdo real (magic bytes) do arquivo gravado
    const caminho = resolve(file.path);
    const valido = await validarConteudoImagem(caminho, file.mimetype);
    if (!valido) {
      try {
        unlinkSync(caminho);
      } catch {
        // arquivo inválido; falha ao apagar não deve quebrar a resposta
      }
      throw new BadRequestException(
        'O conteúdo do arquivo não corresponde a uma imagem válida.',
      );
    }

    return { url: `/uploads/${file.filename}` };
  }
}
