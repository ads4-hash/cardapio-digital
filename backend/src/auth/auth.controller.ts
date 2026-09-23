import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService, obterIpCliente } from './auth.service';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { UsuarioAutenticado } from './current-user.decorator';
import { AtualizarPerfilDto } from './dto/atualizar-perfil.dto';
import { LoginDto } from './dto/login.dto';
import { RegistrarUsuarioDto } from './dto/registrar-usuario.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Cadastra um administrador (login é feito com o e-mail cadastrado).
  // Limite rígido: cadastro é restrito ao primeiro usuário e não pode ser abusado.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('registrar')
  registrar(@Body() dto: RegistrarUsuarioDto, @Req() req: Request) {
    return this.authService.registrar(
      dto.nome,
      dto.email,
      dto.senha,
      dto.confirmarSenha,
      dto.telefone,
      obterIpCliente(req),
    );
  }

  // Nome e contato do estabelecimento exibidos nas telas públicas. Não exige
  // autenticação para que clientes que veem o cardápio/pedido tenham contato.
  @Get('cardapio')
  infoCardapio() {
    return this.authService.obterInfoCardapio();
  }

  // Limite menor no login (em conjunto com o bloqueio por IP no AuthService)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
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

  // Edita os dados do usuário logado (nome, e-mail, senha)
  @UseGuards(AuthGuard)
  @Patch('me')
  atualizarPerfil(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() dto: AtualizarPerfilDto,
  ) {
    return this.authService.atualizarPerfil(
      usuario.id,
      dto.nome,
      dto.email,
      dto.senha,
      dto.confirmarSenha,
      dto.telefone,
    );
  }
}
