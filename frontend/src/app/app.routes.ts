import { Routes } from '@angular/router';
import { ClienteScreenComponent } from './screens/cliente-screen/cliente-screen.component';
import { AdminScreenComponent } from './screens/admin-screen/admin-screen.component';
import { LoginScreenComponent } from './screens/login-screen/login-screen.component';
import { authGuard, convidadoGuard } from './auth.guard';

export const routes: Routes = [
  {
    path: 'cardapio',
    component: ClienteScreenComponent,
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
  {
    path: 'login',
    component: LoginScreenComponent,
    canActivate: [convidadoGuard],
  },
  { path: '**', redirectTo: '/' },
];