import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.getToken();
  const requisicao = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(requisicao).pipe(
    catchError((erro: HttpErrorResponse) => {
      // Sessão expirada/inválida: encerra a sessão e leva para o login
      if (erro.status === 401) {
        const estavaLogado = auth.isAutenticado();
        auth.logout();
        if (estavaLogado && router.url !== '/') {
          router.navigate(['/']);
        }
      }
      return throwError(() => erro);
    }),
  );
};