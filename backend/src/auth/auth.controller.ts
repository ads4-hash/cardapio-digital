import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService, obterIpCliente } from './auth.service';
import type { RespostaTokens } from './auth.service';
import { AuthGuard } from './auth.guard';
import {
  enviarCookieRefresh,
  lerCookieRefresh,
  limparCookieRefresh,
} from './cookie-refresh';
import { CurrentUser } from './current-user.decorator';
import type { UsuarioAutenticado } from './current-user.decorator';
import { AtualizarPerfilDto } from './dto/atualizar-perfil.dto';
import { LoginDto } from './dto/login.dto';
import { RedefinirSenhaDto } from './dto/redefinir-senha.dto';
import { RegistrarUsuarioDto } from './dto/registrar-usuario.dto';
import { SolicitarRecuperacaoDto } from './dto/solicitar-recuperacao.dto';
import { RespostaErroDto } from '../common/dto/resposta-erro.dto';
import {
  InfoCardapioDto,
  MensagemDto,
  PerfilAtualizadoDto,
  RecuperacaoRespostaDto,
  RespostaAuthDto,
  UsuarioPublicoDto,
} from './dto/respostas-auth.dto';

/**
 * Move o refresh token para o cookie HttpOnly e devolve o corpo sem ele: o
 * access token continua no JSON (curto, 15 min), mas o refresh (30 dias) nunca
 * trafega no corpo nem é acessível ao JavaScript.
 */
function responderComSessao(
  res: Response,
  resposta: RespostaTokens,
): Omit<RespostaTokens, 'refreshToken'> {
  enviarCookieRefresh(res, resposta.refreshToken);
  return { token: resposta.token, usuario: resposta.usuario };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Cadastra um administrador e cria o estabelecimento dele (multi-tenant).
  // Onboarding self-service: cada signup gera um novo estabelecimento com sua
  // própria URL /cardapio/:slug. Limite rígido de 5/min por IP para evitar abuso.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('registrar')
  @ApiOperation({
    summary: 'Cadastra um administrador e o estabelecimento dele',
    description:
      'Onboarding self-service: cria o usuário **e** o estabelecimento dele, que já nasce com um `slug` próprio para a URL pública do cardápio. Cada cadastro gera uma nova loja; o e-mail precisa ser único.',
  })
  @ApiBody({ type: RegistrarUsuarioDto })
  @ApiCreatedResponse({ type: RespostaAuthDto, description: 'Conta criada.' })
  @ApiConflictResponse({
    type: RespostaErroDto,
    description: 'E-mail ou slug já está em uso.',
  })
  @ApiTooManyRequestsResponse({
    type: RespostaErroDto,
    description: 'Limite de 5/min por IP.',
  })
  async registrar(
    @Body() dto: RegistrarUsuarioDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Omit<RespostaTokens, 'refreshToken'>> {
    const resposta = await this.authService.registrar(
      dto.nomeEstabelecimento,
      dto.nome,
      dto.email,
      dto.senha,
      dto.confirmarSenha,
      dto.telefone,
      obterIpCliente(req),
    );
    return responderComSessao(res, resposta);
  }

  // Nome e contato do estabelecimento exibidos nas telas públicas. Não exige
  // autenticação para que clientes que veem o cardápio/pedido tenham contato.
  // O slug identifica de qual estabelecimento estamos falando (?slug=).
  @Get('cardapio')
  @ApiOperation({
    summary: 'Nome e telefone do estabelecimento (público)',
    description:
      'Usado nas telas públicas para o cliente ter o contato da casa. Não exige autenticação.',
  })
  @ApiQuery({
    name: 'slug',
    required: true,
    description: 'Slug do estabelecimento, como na URL /cardapio/:slug.',
    example: 'pizzaria-do-ze',
  })
  @ApiOkResponse({ type: InfoCardapioDto })
  @ApiBadRequestResponse({
    type: RespostaErroDto,
    description: 'Parâmetro `slug` ausente.',
  })
  infoCardapio(@Query('slug') slug: string) {
    if (!slug?.trim()) {
      throw new BadRequestException('Informe o estabelecimento (slug).');
    }
    return this.authService.obterInfoCardapio(slug.trim());
  }

  // Limite menor no login (em conjunto com o bloqueio por IP no AuthService)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autentica o administrador e devolve o token JWT',
    description: [
      'O access token (15 min) vai no corpo e deve ser enviado como header `Authorization: Bearer <token>` nos endpoints de painel.',
      'O refresh token (30 dias) vai em um cookie HttpOnly, inacessível ao JavaScript — usado por `POST /auth/refresh`.',
      '',
      'Além do limite de 10/min por IP, o login bloqueia por 15 minutos após 5 falhas',
      'do mesmo IP **ou** 10 do mesmo e-mail (proteção contra credential stuffing',
      'distribuído). A resposta é a mesma para e-mail inexistente e senha errada.',
    ].join('\n'),
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: RespostaAuthDto })
  @ApiUnauthorizedResponse({
    type: RespostaErroDto,
    description: 'E-mail ou senha inválidos.',
  })
  @ApiTooManyRequestsResponse({
    type: RespostaErroDto,
    description: 'Muitas tentativas: aguarde a janela de 15 minutos.',
  })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Omit<RespostaTokens, 'refreshToken'>> {
    const resposta = await this.authService.login(
      dto.email,
      dto.senha,
      obterIpCliente(req),
    );
    return responderComSessao(res, resposta);
  }

  // Renova o access token a partir de um refresh token válido (rotação)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renova o access token usando o refresh token',
    description:
      'O refresh token vai em um cookie HttpOnly, enviado automaticamente pelo navegador. Não há corpo. O token é rotacionado a cada uso: o antigo é revogado e um novo cookie é gravado. Reutilizar um refresh token já usado encerra todas as sessões do usuário (proteção contra roubo).',
  })
  @ApiOkResponse({ type: RespostaAuthDto })
  @ApiUnauthorizedResponse({
    type: RespostaErroDto,
    description: 'Refresh token ausente, inválido, expirado ou reutilizado.',
  })
  async renovar(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Omit<RespostaTokens, 'refreshToken'>> {
    const refreshToken = lerCookieRefresh(req);
    if (!refreshToken) {
      throw new UnauthorizedException('Sessão expirada. Faça login novamente.');
    }
    const resposta = await this.authService.renovarTokens(refreshToken);
    return responderComSessao(res, resposta);
  }

  // Encerra a sessão deste dispositivo revogando o refresh token
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Encerra a sessão atual',
    description:
      'Revoga o refresh token do cookie e o remove. O access token deixa de valer assim que expira (15 min); trocar a senha revoga todas as sessões.',
  })
  @ApiOkResponse({ type: MensagemDto })
  @ApiUnauthorizedResponse({
    type: RespostaErroDto,
    description: 'Token ausente, inválido ou expirado.',
  })
  logout(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = lerCookieRefresh(req);
    limparCookieRefresh(res);
    if (!refreshToken) {
      return { mensagem: 'Sessão encerrada.' };
    }
    return this.authService.logout(refreshToken, usuario.id);
  }

  // Solicita a recuperação de senha (código por e-mail ou exibido em dev)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('recuperar-senha')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicita o código de recuperação de senha',
    description: [
      'Gera um código de uso único válido por 30 minutos e envia por e-mail quando o',
      'SMTP está configurado. Sem SMTP e fora de produção, o código volta na própria',
      'resposta (`token`), para exibir direto na tela.',
      '',
      'A resposta é **sempre 200**, inclusive para e-mails inexistentes, para não',
      'revelar quais contas estão cadastradas.',
    ].join('\n'),
  })
  @ApiBody({ type: SolicitarRecuperacaoDto })
  @ApiOkResponse({ type: RecuperacaoRespostaDto })
  @ApiServiceUnavailableResponse({
    type: RespostaErroDto,
    description: 'SMTP configurado, mas o envio falhou.',
  })
  @ApiTooManyRequestsResponse({ type: RespostaErroDto })
  solicitarRecuperacao(@Body() dto: SolicitarRecuperacaoDto) {
    return this.authService.solicitarRecuperacao(dto.email);
  }

  // Redefine a senha com o código recebido
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('redefinir-senha')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Redefine a senha com o código de recuperação',
    description:
      'Consome o código, de uso único. Trocar a senha encerra **todas** as sessões do usuário (access e refresh tokens).',
  })
  @ApiBody({ type: RedefinirSenhaDto })
  @ApiOkResponse({ type: MensagemDto })
  @ApiUnauthorizedResponse({
    type: RespostaErroDto,
    description: 'Código inválido, já usado ou expirado.',
  })
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
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Dados do usuário logado',
    description:
      'Serve para o frontend validar o token guardado no navegador na abertura do painel.',
  })
  @ApiOkResponse({ type: UsuarioPublicoDto })
  @ApiUnauthorizedResponse({
    type: RespostaErroDto,
    description: 'Token ausente, inválido ou expirado.',
  })
  me(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.authService.me(usuario.id);
  }

  // Edita os dados do usuário logado (nome, e-mail, senha)
  @UseGuards(AuthGuard)
  @Patch('me')
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Atualiza os dados do usuário logado',
    description: [
      '`nome` e `email` são obrigatórios — envie sempre os dois, mesmo que só um',
      'tenha mudado. Os demais campos só precisam vir quando forem alterados.',
      '',
      '**Trocar o e-mail ou a senha exige `senhaAtual`** — é o que impede quem',
      'roubasse o token de tomar a conta num único PATCH. Alterar apenas nome e',
      'telefone não pede senha.',
    ].join('\n'),
  })
  @ApiBody({ type: AtualizarPerfilDto })
  @ApiOkResponse({ type: PerfilAtualizadoDto })
  @ApiBadRequestResponse({
    type: RespostaErroDto,
    description:
      'Senha atual incorreta ou ausente, ou as senhas novas não conferem.',
  })
  @ApiUnauthorizedResponse({
    type: RespostaErroDto,
    description: 'Token ausente, inválido ou expirado.',
  })
  @ApiConflictResponse({
    type: RespostaErroDto,
    description: 'E-mail já usado por outro administrador.',
  })
  async atualizarPerfil(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() dto: AtualizarPerfilDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const perfil = await this.authService.atualizarPerfil(
      usuario.id,
      dto.nome,
      dto.email,
      dto.senha,
      dto.confirmarSenha,
      dto.telefone,
      dto.senhaAtual,
    );
    // Troca de credencial: o serviço emitiu um par novo. O refresh vai para o
    // cookie (como no login) e o corpo fica com o perfil + access token.
    if (perfil.refreshToken) {
      enviarCookieRefresh(res, perfil.refreshToken);
      return { ...perfil, refreshToken: undefined };
    }
    return perfil;
  }
}
