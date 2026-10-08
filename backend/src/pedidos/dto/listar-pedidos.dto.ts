import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PEDIDO_STATUS } from './update-pedido.dto';

/**
 * Filtros do GET /pedidos (painel).
 *
 * A paginação é OPCIONAL: sem os parâmetros o endpoint continua devolvendo a
 * lista inteira, exatamente como antes — o painel atual não muda de
 * comportamento. Com `pagina`/`tamanhoPagina`, a resposta passa a ser uma
 * fatia, para o painel não precisar baixar o histórico inteiro do restaurante.
 */
export class ListarPedidosDto {
  @ApiPropertyOptional({
    description:
      'Página (1 em diante). Se presente, o endpoint pagina (tamanho padrão: 50).',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number;

  @ApiPropertyOptional({
    description: 'Itens por página (usado com `pagina`; máximo 200).',
    example: 50,
    minimum: 1,
    maximum: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  tamanhoPagina?: number;

  @ApiPropertyOptional({
    description: 'Filtra por um status exato (sem paginação implícita).',
    enum: PEDIDO_STATUS,
  })
  @IsOptional()
  @IsIn(PEDIDO_STATUS, { message: 'Status inválido para o filtro.' })
  status?: string;
}
