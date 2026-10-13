import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ProdutoService } from './produto.service';
import { REQUISICAO_PUBLICA } from '../core/http-publico';

describe('ProdutoService', () => {
  let service: ProdutoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(ProdutoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('marca como pública a listagem de produtos do cardápio', () => {
    service.listar('jujub', true).subscribe();

    const req = httpMock.expectOne((r) => r.url.includes('/produtos'));
    expect(req.request.context.get(REQUISICAO_PUBLICA)).toBe(true);
    req.flush([]);
  });

  it('não marca como pública a listagem de produtos do admin', () => {
    service.listar('jujub', false).subscribe();

    const req = httpMock.expectOne((r) => r.url.includes('/produtos'));
    expect(req.request.context.get(REQUISICAO_PUBLICA)).toBe(false);
    req.flush([]);
  });
});
