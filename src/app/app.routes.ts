import { Routes } from '@angular/router';
import { DashboardTemporal } from './pages/dashboard-temporal/dashboard-temporal';
import { authGuard } from './guards/auth.guard';
import { Login } from './pages/login/login';
export const routes: Routes = [
    { path: 'login', component: Login },
  { path: 'dashboard', canActivate: [authGuard],
    component: DashboardTemporal },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
];
