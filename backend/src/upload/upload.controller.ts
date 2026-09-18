import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';

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
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Somente arquivos de imagem (JPG, PNG, WEBP, GIF) são permitidos.',
            ),
            false,
          );
        }
      },
      limits: { fileSize: MAX_SIZE },
    }),
  )
  upload(@Req() req: Request, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado.');
    }
    return { url: `/uploads/${file.filename}` };
  }
}
