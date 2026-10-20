import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AdminPerfilComponent } from './admin-perfil.component';
import { ConfiguracoesService } from '../../services/configuracoes.service';

describe('AdminPerfilComponent - dados Pix', () => {
  let c: AdminPerfilComponent;
  let configuracoes: ConfiguracoesService;
  let salvarPixSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    c = TestBed.createComponent(AdminPerfilComponent).componentInstance;
    configuracoes = TestBed.inject(ConfiguracoesService);
    salvarPixSpy = vi
      .spyOn(configuracoes, 'salvarPix')
      .mockReturnValue(
        of({
          tipoChave: 'CPF',
          chave: '123.456.789-00',
          titular: null,
          instituicao: null,
          qrUrl: null,
        }),
      );
  });

  it('digitar em qualquer campo Pix marca o formulário como alterado', () => {
    expect(c.pixAlterado()).toBe(false);
    c.alterarPix('chave', '123');
    expect(c.pixAlterado()).toBe(true);
    expect(c.pixChave()).toBe('123');
  });

  it('salvarPix sem tipo mostra erro e não chama a API', () => {
    c.alterarPix('chave', '123.456.789-00');

    c.salvarPix();

    expect(c.pixErro()).toContain('tipo da chave');
    expect(salvarPixSpy).not.toHaveBeenCalled();
  });

  it('salvarPix sem chave mostra erro e não chama a API', () => {
    c.alterarPix('tipoChave', 'CPF');

    c.salvarPix();

    expect(c.pixErro()).toContain('chave Pix');
    expect(salvarPixSpy).not.toHaveBeenCalled();
  });

  it('salvarPix envia os campos normalizados e limpa o rascunho no sucesso', () => {
    c.alterarPix('tipoChave', 'EMAIL');
    c.alterarPix('chave', '  pizza@exemplo.com  ');
    c.alterarPix('titular', 'João ');
    c.alterarPix('instituicao', '');

    c.salvarPix();

    expect(salvarPixSpy).toHaveBeenCalledWith({
      tipoChave: 'EMAIL',
      chave: 'pizza@exemplo.com',
      titular: 'João',
      instituicao: null,
      qrUrl: null,
    });
    expect(c.pixSalvando()).toBe(false);
    expect(c.pixAlterado()).toBe(false);
    expect(c.pixSucesso()).toContain('sucesso');
    expect(c.pixErro()).toBe('');
  });

  it('removerQrPix limpa a URL e marca alteração para o PATCH enviar null', () => {
    c.pixQrUrl.set('/uploads/est-1/qr.png');

    c.removerQrPix();

    expect(c.pixQrUrl()).toBe('');
    expect(c.pixAlterado()).toBe(true);
  });
});
