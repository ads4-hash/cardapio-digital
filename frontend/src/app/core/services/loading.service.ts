import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private readonly _ativo = signal(0);
  readonly ativo = this._ativo.asReadonly();

  mostrar(): void {
    this._ativo.update((v) => v + 1);
  }

  ocultar(): void {
    this._ativo.update((v) => Math.max(0, v - 1));
  }
}
