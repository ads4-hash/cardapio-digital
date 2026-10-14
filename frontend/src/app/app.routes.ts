import { Routes } from '@angular/router';
import { authGuard, convidadoGuard } from './core/auth.guard';

// Cada tela vira um chunk sob demanda (loadComponent): o cardápio público não
// baixa o painel admin, o login não baixa o rastreio, e assim por diante.
export const routes: Routes = [
  {
    path: 'cardapio/:slug',
    loadComponent: () =>
      import('./screens/cliente-screen/cliente-screen.component').then(
        (m) => m.ClienteScreenComponent,
      ),
  },
  {
    path: 'cardapio',
    redirectTo: '/',
    pathMatch: 'full',
  },
  {
    path: 'pedido/:id',
    loadComponent: () =>
      import('./screens/pedido-status/pedido-status.component').then(
        (m) => m.PedidoStatusComponent,
      ),
  },
  {
    path: '',
    loadComponent: () =>
      import('./screens/login-screen/login-screen.component').then(
        (m) => m.LoginScreenComponent,
      ),
    canActivate: [convidadoGuard],
  },
  {
    path: 'recuperar-senha',
    loadComponent: () =>
      import('./screens/recuperar-senha/recuperar-senha.component').then(
        (m) => m.RecuperarSenhaScreenComponent,
      ),
    canActivate: [convidadoGuard],
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./screens/admin-screen/admin-screen.component').then(
        (m) => m.AdminScreenComponent,
      ),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '/' },
];
