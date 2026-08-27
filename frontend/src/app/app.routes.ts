import { Routes } from '@angular/router';
import { ClienteScreenComponent } from './screens/cliente-screen/cliente-screen.component';
import { AdminScreenComponent } from './screens/admin-screen/admin-screen.component';

export const routes: Routes = [
  { path: '', component: ClienteScreenComponent },
  { path: 'admin', component: AdminScreenComponent },
  { path: '**', redirectTo: '' },
];
