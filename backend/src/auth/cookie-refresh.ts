import type { CookieOptions, Request, Response } from 'express';

/**
 * Nome do cookie que carrega o refresh token. Ele fica em um cookie HttpOnly
 * (inacessível ao JavaScript do navegador), para que um XSS não consiga roubar
 * a credencial de longa duração — antes ele era guardado em `localStorage`.
 */
export const COOKIE_REFRESH = 'refresh_token';

/** Mesma validade do refresh token no banco (30 dias). */
const VALIDADE_REFRESH_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Atributos do cookie. Ficam restritos ao caminho `/auth` (login/refresh/logout
 * são as únicas rotas que precisam dele), então ele nem é enviado nas demais
 * chamadas da API.
 *
 * - `httpOnly`: o JavaScript não enxerga o valor (proteção contra XSS).
 * - `sameSite`: `lax` por padrão. Como o painel (ex.: localhost:4200) e a API
 *   (localhost:3000) são o mesmo "site", o cookie acompanha as chamadas com
 *   credenciais. Para frontend e API em domínios diferentes de verdade, defina
 *   `COOKIE_SAMESITE=none` (exige `secure`).
 * - `secure`: liga em produção (HTTPS). Pode ser forçado por `COOKIE_SECURE`.
 */
function opcoesCookie(): CookieOptions {
  const emProducao = process.env.NODE_ENV === 'production';
  const sameSite = process.env.COOKIE_SAMESITE?.trim().toLowerCase() || 'lax';
  const secure = process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE.trim().toLowerCase() === 'true'
    : emProducao;
  return {
    httpOnly: true,
    secure,
    sameSite: sameSite as CookieOptions['sameSite'],
    path: '/auth',
  };
}

/** Grava o refresh token no cookie HttpOnly (rotacionado a cada uso). */
export function enviarCookieRefresh(res: Response, refreshToken: string): void {
  res.cookie(COOKIE_REFRESH, refreshToken, {
    ...opcoesCookie(),
    maxAge: VALIDADE_REFRESH_MS,
  });
}

/** Remove o cookie de refresh (logout). */
export function limparCookieRefresh(res: Response): void {
  res.clearCookie(COOKIE_REFRESH, opcoesCookie());
}

/**
 * Lê o refresh token do cookie. O cast evita depender do tipo `any` que o
 * `cookie-parser` dá a `req.cookies` (o lint de tipos do projeto reclama de
 * acesso a `any`).
 */
export function lerCookieRefresh(req: Request): string | undefined {
  const { cookies } = req as { cookies?: Record<string, unknown> };
  const valor = cookies?.[COOKIE_REFRESH];
  return typeof valor === 'string' ? valor : undefined;
}
