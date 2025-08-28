import { Routes } from '@angular/router';
import { DashboardTemporal } from './pages/dashboard-temporal/dashboard-temporal';

export const routes: Routes = [
    { path: 'dashboard', component: DashboardTemporal },
    { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    { path: '**', redirectTo: 'dashboard' },
];
