import { Routes } from '@angular/router';
import { ClienteScreenComponent } from './screens/cliente-screen/cliente-screen.component';
import { AdminScreenComponent } from './screens/admin-screen/admin-screen.component';
import { LoginScreenComponent } from './screens/login-screen/login-screen.component';
import { PedidoStatusComponent } from './screens/pedido-status/pedido-status.component';
import { RecuperarSenhaScreenComponent } from './screens/recuperar-senha/recuperar-senha.component';
import { authGuard, convidadoGuard } from './auth.guard';

export const routes: Routes = [
  {
    path: 'cardapio/:slug',
    component: ClienteScreenComponent,
  },
  {
    path: 'cardapio',
    redirectTo: '/',
    pathMatch: 'full',
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
    path: 'recuperar-senha',
    component: RecuperarSenhaScreenComponent,
    canActivate: [convidadoGuard],
  },
  {
    path: 'admin',
    component: AdminScreenComponent,
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '/' },
];