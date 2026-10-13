import { TestBed } from '@angular/core/testing';
import {
  HttpContext,
  HttpHandlerFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from './services/auth.service';
import { REQUISICAO_PUBLICA } from './http-publico';

describe('authInterceptor', () => {
  let auth: AuthService;
  let capturada: HttpRequest<unknown> | null;

  const next: HttpHandlerFn = (req) => {
    capturada = req;
    return of(new HttpResponse({ status: 200 }));
  };

  const executar = (req: HttpRequest<unknown>) => {
    TestBed.runInInjectionContext(() => authInterceptor(req, next));
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [provideRouter([])],
    });
    auth = TestBed.inject(AuthService);
    capturada = null;
  });

  it('anexa o token em requisições normais', () => {
    vi.spyOn(auth, 'getToken').mockReturnValue('token-123');

    executar(new HttpRequest('GET', '/produtos'));

    expect(capturada?.headers.get('Authorization')).toBe('Bearer token-123');
  });

  it('não anexa o token em requisições públicas', () => {
    vi.spyOn(auth, 'getToken').mockReturnValue('token-123');
    const context = new HttpContext().set(REQUISICAO_PUBLICA, true);

    executar(new HttpRequest('GET', '/produtos', { context }));

    expect(capturada?.headers.has('Authorization')).toBe(false);
  });
});
