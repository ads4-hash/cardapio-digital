import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environment';
import { firstValueFrom } from 'rxjs';

export interface MesaLivre {
  id: string;
  numero: number;
  status: string;
}

@Injectable({
  providedIn: 'root',
})
export class MesasPublicasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  async listarLivres(slug: string): Promise<MesaLivre[]> {
    return firstValueFrom(
      this.http.get<MesaLivre[]>(`${this.apiUrl}/public/mesas/${slug}/livres`),
    );
  }
}
