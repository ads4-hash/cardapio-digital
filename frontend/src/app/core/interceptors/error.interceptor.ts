import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((erro: HttpErrorResponse) => {
      // Mantido simples: componentes podem tratar mensagens específicas.
      // Se quiser toasts globais, adicionar MatSnackBar aqui quando disponível.
      return throwError(() => erro);
    }),
  );
};
