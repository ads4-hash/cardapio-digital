import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AdminCadastroComponent } from './admin-cadastro.component';
import { Ingrediente, ProdutoService } from '../../services/produto.service';

function lista(...nomes: string[]): Ingrediente[] {
  return nomes.map((nome) => ({ id: `ing-${nome}`, nome }));
}

function montar(ingredientes: Ingrediente[]) {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: ProdutoService,
        useValue: {
          listarIngredientes: () => of(ingredientes),
          categorias: () => [],
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(AdminCadastroComponent);
  fixture.detectChanges();
  return fixture.componentInstance;
}

describe('AdminCadastroComponent - ordem dos ingredientes', () => {
  it('põe os selecionados no topo da lista', () => {
    const c = montar(lista('Alface', 'Bacon', 'Cebola', 'Tomate'));

    c.alternarIngrediente('ing-Cebola');

    expect(c.ingredientesFiltrados().map((i) => i.nome)).toEqual([
      'Cebola',
      'Alface',
      'Bacon',
      'Tomate',
    ]);
  });

  it('mantém os selecionados no topo mesmo com busca ativa', () => {
    const c = montar(lista('Alface', 'Bacon', 'Cebola', 'Tomate'));

    c.alternarIngrediente('ing-Cebola');
    c.buscaIngrediente.set('o');

    expect(c.ingredientesFiltrados().map((i) => i.nome)).toEqual([
      'Cebola',
      'Bacon',
      'Tomate',
    ]);
  });
});
