import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ProdutoService } from './produto.service';

describe('ProdutoService', () => {
  let service: ProdutoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(ProdutoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
