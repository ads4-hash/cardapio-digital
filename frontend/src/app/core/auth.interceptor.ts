import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { REQUISICAO_PUBLICA } from './http-publico';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = req.context.get(REQUISICAO_PUBLICA) ? null : auth.getToken();
  const requisicao = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  // Rotas de autenticação não devem disparar refresh (evita loop).
  const ehRotaDeAuth = /\/auth\/(login|registrar|refresh|logout)/.test(req.url);

  return next(requisicao).pipe(
    catchError((erro: HttpErrorResponse) => {
      // Access token expirado: renova com o refresh token e repete a
      // requisição uma única vez.
      if (erro.status === 401 && !ehRotaDeAuth && auth.getRefreshToken()) {
        return auth.renovarToken().pipe(
          switchMap((resposta) => {
            const repetida = req.clone({
              setHeaders: { Authorization: `Bearer ${resposta.token}` },
            });
            return next(repetida);
          }),
          catchError(() => {
            encerrarSessao(auth, router);
            return throwError(() => erro);
          }),
        );
      }

      // Sem refresh possível: encerra a sessão e leva para o login
      if (erro.status === 401) {
        encerrarSessao(auth, router);
      }
      return throwError(() => erro);
    }),
  );
};

function encerrarSessao(auth: AuthService, router: Router): void {
  const estavaLogado = auth.isAutenticado();
  auth.limparSessao();
  if (estavaLogado && router.url !== '/') {
    router.navigate(['/']);
  }
}