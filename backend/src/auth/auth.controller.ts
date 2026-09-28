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
import { RespostaErroDto } from '../common/dto/resposta-erro.dto';
import {
  InfoCardapioDto,
  MensagemDto,
  RecuperacaoRespostaDto,
  RespostaAuthDto,
  UsuarioPublicoDto,
} from './dto/respostas-auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Cadastra um administrador e cria o estabelecimento dele (multi-tenant).
  // Cada signup gera um novo estabelecimento com sua própria URL /cardapio/:slug.
  // Limite rígido: cadastro é restrito a 5/min por IP para evitar abuso.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('registrar')
  @ApiOperation({
    summary: 'Cadastra o administrador (somente o primeiro usuário)',
    description:
      'Cria o usuário **e** o estabelecimento dele, que já nasce com um `slug` próprio para a URL pública do cardápio. É um bootstrap: depois do primeiro cadastro o endpoint responde 409 e novos administradores não podem ser criados por aqui.',
  })
  @ApiBody({ type: RegistrarUsuarioDto })
  @ApiCreatedResponse({ type: RespostaAuthDto, description: 'Conta criada.' })
  @ApiConflictResponse({
    type: RespostaErroDto,
    description: 'Já existe um administrador, ou o e-mail/slug já está em uso.',
  })
  @ApiTooManyRequestsResponse({
    type: RespostaErroDto,
    description: 'Limite de 5/min por IP.',
  })
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
      'O token vai no header `Authorization: Bearer <token>` nos endpoints de painel.',
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
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto.email, dto.senha, obterIpCliente(req));
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
      'Consome o código, de uso único. Atenção: o token JWT não carrega a senha, então sessões já abertas continuam válidas até expirar (7 dias).',
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
      'Todos os campos são opcionais: envie só o que mudar.',
      '',
      '**Trocar o e-mail ou a senha exige `senhaAtual`** — é o que impede quem',
      'roubasse o token de tomar a conta num único PATCH. Alterar apenas nome e',
      'telefone não pede senha.',
    ].join('\n'),
  })
  @ApiBody({ type: AtualizarPerfilDto })
  @ApiOkResponse({ type: UsuarioPublicoDto })
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
      dto.senhaAtual,
    );
  }
}
