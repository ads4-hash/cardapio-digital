import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, obterIpCliente } from './auth.service';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { UsuarioAutenticado } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegistrarUsuarioDto } from './dto/registrar-usuario.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Cadastra um administrador (login é feito com o e-mail cadastrado)
  @Post('registrar')
  registrar(@Body() dto: RegistrarUsuarioDto, @Req() req: Request) {
    return this.authService.registrar(
      dto.nome,
      dto.email,
      dto.senha,
      dto.confirmarSenha,
      obterIpCliente(req),
    );
  }

  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto.email, dto.senha, obterIpCliente(req));
  }

  // Valida a sessão atual e retorna os dados do usuário logado
  @UseGuards(AuthGuard)
  @Get('me')
  me(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.authService.me(usuario.id);
  }
}