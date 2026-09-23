import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RealtimeService } from './realtime.service';
import type { Pedido } from './pedidos.service';

// Notifica o admin quando um novo pedido chega, mesmo fora da seção de pedidos:
// badge/toast na tela, som e notificação do navegador (quando permitida).
@Injectable({ providedIn: 'root' })
export class AdminNotificacoesService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly realtime = inject(RealtimeService);

  // Pedidos recebidos em tempo real e ainda não vistos pelo admin
  readonly novosPedidos = signal<Pedido[]>([]);

  private contextoAudio?: AudioContext;
  private notificado = false;

  iniciar(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.realtime.conectar();
    this.realtime.pedidoCriado$.subscribe((pedido) =>
      this.chegarPedido(pedido),
    );
  }

  marcarComoVistos(): void {
    this.novosPedidos.set([]);
  }

  private chegarPedido(pedido: Pedido): void {
    this.novosPedidos.update((lista) => [...lista.slice(-19), pedido]);
    try {
      this.tocarSom();
    } catch {
      // áudio indisponível no navegador: apenas não toca
    }
    this.notificarNavegador(pedido);
  }

  // Dois tons curtos gerados via Web Audio (sem precisar de arquivo de áudio)
  private tocarSom(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const ClasseAudio =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!ClasseAudio) return;
    this.contextoAudio ??= new ClasseAudio();
    const ctx = this.contextoAudio;

    const nota = (frequencia: number, inicio: number, duracao: number) => {
      const oscilador = ctx.createOscillator();
      const ganho = ctx.createGain();
      oscilador.type = 'sine';
      oscilador.frequency.value = frequencia;
      ganho.gain.setValueAtTime(0.0001, ctx.currentTime + inicio);
      ganho.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + inicio + 0.03);
      ganho.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + inicio + duracao);
      oscilador.connect(ganho);
      ganho.connect(ctx.destination);
      oscilador.start(ctx.currentTime + inicio);
      oscilador.stop(ctx.currentTime + inicio + duracao + 0.05);
    };

    nota(880, 0, 0.22);
    nota(1318.5, 0.22, 0.3);
  }

  private notificarNavegador(pedido: Pedido): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (typeof Notification === 'undefined') return;
    try {
      if (Notification.permission === 'denied') return;
      if (Notification.permission === 'default') {
        if (!this.notificado) {
          this.notificado = true;
          Notification.requestPermission();
        }
        return;
      }
      const itens = pedido.itens.length;
      new Notification('Novo pedido!', {
        body: `${pedido.cliente} · ${itens} ${itens === 1 ? 'item' : 'itens'} · R$ ${pedido.total.toFixed(2).replace('.', ',')}`,
      });
    } catch {
      // notificação indisponível/bloqueada no navegador: ignora
    }
  }
}