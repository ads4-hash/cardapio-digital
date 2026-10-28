import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MesasService } from './mesas.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/current-user.decorator';

@ApiTags('mesas')
@Controller('mesas')
export class MesasController {
  constructor(private readonly mesasService: MesasService) {}

  @UseGuards(AuthGuard)
  @Get()
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Lista mesas do estabelecimento (admin)' })
  listarAdmin(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.mesasService.listarAdmin(usuario.estabelecimentoId);
  }

  @UseGuards(AuthGuard)
  @Post()
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Cria mesa (admin)' })
  criar(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() body: { numero: number },
  ) {
    return this.mesasService.criar(usuario.estabelecimentoId, Number(body.numero));
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Remove mesa (admin)' })
  remover(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.mesasService.remover(usuario.estabelecimentoId, id);
  }
}

@ApiTags('mesas-publico')
@Controller('public/mesas')
export class MesasPublicasController {
  constructor(private readonly mesasService: MesasService) {}

  @Get(':slug/livres')
  @ApiOperation({ summary: 'Lista mesas livres para seleção no cardápio' })
  listarLivres(@Param('slug') slug: string) {
    return this.mesasService.listarLivres(slug);
  }
}
