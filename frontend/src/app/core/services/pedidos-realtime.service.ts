import { Injectable, PLATFORM_ID, inject, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environment';
import type { Pedido } from '../../models/pedido.model';
import { AuthService } from '../../services/auth.service';

const EVENTO_CRIADO = 'pedido.criado';
const EVENTO_ATUALIZADO = 'pedido.atualizado';
const EVENTO_REMOVIDO = 'pedido.removido';

@Injectable({ providedIn: 'root' })
export class PedidosRealtimeService implements OnDestroy {
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
    if (!isPlatformBrowser(this.platformId) || this.socket?.connected) return;

    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
    }

    const { io } = await import('socket.io-client');

    this.socket = io(environment.publicApiUrl, {
      transports: ['websocket'],
      auth: (cb) => cb({ token: this.auth.getToken() ?? '' }),
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5_000,
      timeout: 10_000,
      autoConnect: true,
    });

    this.socket.on('connect', () => {});
    this.socket.on('disconnect', () => {});
    this.socket.on('connect_error', () => {});

    this.socket.on(EVENTO_CRIADO, (pedido: Pedido) => this.novo.next(pedido));
    this.socket.on(EVENTO_ATUALIZADO, (pedido: Pedido) =>
      this.atualizado.next(pedido),
    );
    this.socket.on(EVENTO_REMOVIDO, (id: string) => this.removido.next(id));
  }

  desconectar(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = undefined;
    }
  }

  ngOnDestroy(): void {
    this.desconectar();
    this.novo.complete();
    this.atualizado.complete();
    this.removido.complete();
  }
}
