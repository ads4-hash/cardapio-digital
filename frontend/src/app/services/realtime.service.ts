import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, Subject } from 'rxjs';
import { environment } from '../environment';
import type { Pedido } from './pedidos.service';
import { AuthService } from './auth.service';

const EVENTO_CRIADO = 'pedido.criado';
const EVENTO_ATUALIZADO = 'pedido.atualizado';
const EVENTO_REMOVIDO = 'pedido.removido';

// Conecta ao WebSocket do backend para receber alterações de pedidos em tempo real
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly auth = inject(AuthService);

  private socket?: import('socket.io-client').Socket;

  private readonly novo = new Subject<Pedido>();
  private readonly atualizado = new Subject<Pedido>();
  private readonly removido = new Subject<string>();

  readonly pedidoCriado$: Observable<Pedido> = this.novo.asObservable();
  readonly pedidoAtualizado$: Observable<Pedido> = this.atualizado.asObservable();
  readonly pedidoRemovido$: Observable<string> = this.removido.asObservable();

  async conectar(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || this.socket) return;

    // Import dinâmico: mantém o socket.io-client fora do bundle do servidor (SSR)
    const { io } = await import('socket.io-client');

    // URL pública: o socket só é aberto no browser, que não resolve hostnames
    // internos do container (ver comentário em environment.ts)
    this.socket = io(environment.publicApiUrl, {
      transports: ['websocket'],
      auth: { token: this.auth.getToken() },
      // Sem reconexão automática, um corte de rede no meio do turno derrubava
      // o painel do tempo real até o próximo reload — e o admin só percebia
      // quando faltava um pedido. O token do handshake é reutilizado nas
      // tentativas (válido por dias, então não há risco de expirar no meio).
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 10_000,
    });

    this.socket.on(EVENTO_CRIADO, (pedido: Pedido) => this.novo.next(pedido));
    this.socket.on(EVENTO_ATUALIZADO, (pedido: Pedido) =>
      this.atualizado.next(pedido),
    );
    this.socket.on(EVENTO_REMOVIDO, (id: string) => this.removido.next(id));
  }
}