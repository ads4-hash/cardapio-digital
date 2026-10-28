import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

const EXCLUIR_LOADING = [/\/health/, /\/config\.js/];

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loading = inject(LoadingService);
  const deveExibir = !EXCLUIR_LOADING.some((regex) => regex.test(req.url));

  if (deveExibir) {
    loading.mostrar();
  }

  return next(req).pipe(
    finalize(() => {
      if (deveExibir) {
        loading.ocultar();
      }
    }),
  );
};
