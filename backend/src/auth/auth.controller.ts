import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
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
import { RedefinirSenhaDto } from './dto/redefinir-senha.dto';
import { RegistrarUsuarioDto } from './dto/registrar-usuario.dto';
import { SolicitarRecuperacaoDto } from './dto/solicitar-recuperacao.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Cadastra um administrador e cria o estabelecimento dele (multi-tenant).
  // Cada signup gera um novo estabelecimento com sua própria URL /cardapio/:slug.
  // Limite rígido: cadastro é restrito a 5/min por IP para evitar abuso.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('registrar')
  registrar(@Body() dto: RegistrarUsuarioDto, @Req() req: Request) {
    return this.authService.registrar(
      dto.nomeEstabelecimento,
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
  // O slug identifica de qual estabelecimento estamos falando (?slug=).
  @Get('cardapio')
  infoCardapio(@Query('slug') slug: string) {
    if (!slug?.trim()) {
      throw new BadRequestException('Informe o estabelecimento (slug).');
    }
    return this.authService.obterInfoCardapio(slug.trim());
  }

  // Limite menor no login (em conjunto com o bloqueio por IP no AuthService)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto.email, dto.senha, obterIpCliente(req));
  }

  // Solicita a recuperação de senha (código por e-mail ou exibido em dev)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('recuperar-senha')
  solicitarRecuperacao(@Body() dto: SolicitarRecuperacaoDto) {
    return this.authService.solicitarRecuperacao(dto.email);
  }

  // Redefine a senha com o código recebido
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('redefinir-senha')
  redefinirSenha(@Body() dto: RedefinirSenhaDto) {
    return this.authService.redefinirSenha(
      dto.token,
      dto.novaSenha,
      dto.confirmarSenha,
    );
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
