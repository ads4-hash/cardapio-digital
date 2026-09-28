import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'cardapio/:slug',
    renderMode: RenderMode.Server,
  },
  {
    path: 'pedido/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'admin',
    renderMode: RenderMode.Server,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];