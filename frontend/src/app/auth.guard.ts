import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';

import { AuthService } from './services/auth.service';

// Impede acesso ao /admin sem sessão válida
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAutenticado()) {
    return router.createUrlTree(['/login']);
  }

  try {
    await lastValueFrom(auth.verificarSessao());
    return true;
  } catch {
    auth.logout();
    return router.createUrlTree(['/login']);
  }
};

// Se já estiver logado, /login redireciona para o painel admin
export const convidadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAutenticado()) {
    return router.createUrlTree(['/admin']);
  }
  return true;
};