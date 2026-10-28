import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ComandasService } from './comandas.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/current-user.decorator';

@ApiTags('comandas')
@UseGuards(AuthGuard)
@ApiBearerAuth('bearer')
@Controller('comandas')
export class ComandasController {
  constructor(private readonly comandasService: ComandasService) {}

  @Get()
  @ApiOperation({ summary: 'Lista comandas abertas do estabelecimento' })
  listar(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.comandasService.listar(usuario.estabelecimentoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma comanda' })
  obter(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.comandasService.obterPorId(usuario.estabelecimentoId, id);
  }

  @Patch(':id/fechar')
  @ApiOperation({ summary: 'Fecha comanda e libera mesa' })
  fechar(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.comandasService.fechar(
      usuario.estabelecimentoId,
      id,
      (usuario as any).sub ?? (usuario as any).id,
    );
  }
}
