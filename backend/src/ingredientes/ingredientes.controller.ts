import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { IngredientesService } from './ingredientes.service';
import { CreateIngredienteDto, UpdateIngredienteDto } from './dto/create-ingrediente.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('ingredientes')
export class IngredientesController {
  constructor(private readonly ingredientesService: IngredientesService) {}

  @Get()
  findAll() {
    return this.ingredientesService.findAll();
  }

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() dto: CreateIngredienteDto) {
    return this.ingredientesService.create(dto);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateIngredienteDto) {
    return this.ingredientesService.update(id, dto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ingredientesService.remove(id);
  }
}
