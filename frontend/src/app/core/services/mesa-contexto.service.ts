import { Injectable, signal } from '@angular/core';

export interface MesaSelecionada {
  id: string;
  numero: number;
}

@Injectable({
  providedIn: 'root',
})
export class MesaContextoService {
  readonly mesaSelecionada = signal<MesaSelecionada | null>(null);

  constructor() {
    if (typeof localStorage !== 'undefined') {
      try {
        const salvo = localStorage.getItem('mesa_atual');
        if (salvo) {
          this.mesaSelecionada.set(JSON.parse(salvo));
        }
      } catch {
        // ignora
      }
    }
  }

  definir(mesa: MesaSelecionada): void {
    this.mesaSelecionada.set(mesa);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mesa_atual', JSON.stringify(mesa));
    }
  }

  limpar(): void {
    this.mesaSelecionada.set(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('mesa_atual');
    }
  }
}
