import { Routes } from '@angular/router';
import { ClienteScreenComponent } from './screens/cliente-screen/cliente-screen.component';
import { AdminScreenComponent } from './screens/admin-screen/admin-screen.component';
import { LoginScreenComponent } from './screens/login-screen/login-screen.component';
import { PedidoStatusComponent } from './screens/pedido-status/pedido-status.component';
import { authGuard, convidadoGuard } from './auth.guard';

export const routes: Routes = [
  {
    path: 'cardapio',
    component: ClienteScreenComponent,
  },
  {
    path: 'pedido/:id',
    component: PedidoStatusComponent,
  },
  {
    path: '',
    component: LoginScreenComponent,
    canActivate: [convidadoGuard],
  },
  {
    path: 'admin',
    component: AdminScreenComponent,
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '/' },
];