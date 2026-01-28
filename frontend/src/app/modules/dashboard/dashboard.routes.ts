import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from './components/dashboard-layout/dashboard-layout.component';
import { memberGuard } from '../../core/guards/member.guard';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'board',
        pathMatch: 'full'
      },
      {
        path: 'board',
        loadComponent: () => import('../board/components/board-list/board-list.component').then(m => m.BoardListComponent)
      },
      {
        path: 'board/:id',
        loadComponent: () => import('../board/components/board-view/board-view.component').then(m => m.BoardViewComponent)
      },
      {
        path: 'projects',
        loadComponent: () => import('../projects/components/project-list/project-list.component').then(m => m.ProjectListComponent)
      },
      {
        path: 'calendar',
        loadComponent: () => import('../calendar/components/calendar-view/calendar-view.component').then(m => m.CalendarViewComponent)
      },
      {
        path: 'clients',
        loadComponent: () => import('../clients/components/client-list/client-list.component').then(m => m.ClientListComponent)
      },
      {
        path: 'clients/create',
        loadComponent: () => import('../clients/components/client-form/client-form.component').then(m => m.ClientFormComponent)
      },
      {
        path: 'clients/edit/:id',
        loadComponent: () => import('../clients/components/client-form/client-form.component').then(m => m.ClientFormComponent)
      },
      {
        path: 'clients/detail/:id',
        loadComponent: () => import('../clients/components/client-detail/client-detail.component').then(m => m.ClientDetailComponent)
      },
      {
        path: 'teams',
        loadComponent: () => import('../teams/components/team-list/team-list.component').then(m => m.TeamListComponent)
      },
      {
        path: 'teams/charts',
        loadComponent: () => import('../teams/components/team-charts/team-charts.component').then(m => m.TeamChartsComponent)
      },
      {
        path: 'admin',
        canActivate: [memberGuard],
        loadComponent: () => import('../admin/components/admin-panel/admin-panel.component').then(m => m.AdminPanelComponent)
      },
      {
        path: 'admin/projects',
        canActivate: [memberGuard],
        loadComponent: () => import('../projects/components/project-list/project-list.component').then(m => m.ProjectListComponent)
      },
      {
        path: 'admin/statuses',
        canActivate: [memberGuard],
        loadComponent: () => import('../admin/components/status-admin/status-admin.component').then(m => m.StatusAdminComponent)
      },
      {
        path: 'admin/teams',
        canActivate: [memberGuard],
        loadComponent: () => import('../teams/components/team-list/team-list.component').then(m => m.TeamListComponent)
      },
      {
        path: 'admin/suppliers',
        canActivate: [memberGuard],
        loadComponent: () => import('../inventory/components/supplier-list/supplier-list.component').then(m => m.SupplierListComponent)
      },
      {
        path: 'admin/suppliers/create',
        canActivate: [memberGuard],
        loadComponent: () => import('../inventory/components/supplier-form/supplier-form.component').then(m => m.SupplierFormComponent)
      },
      {
        path: 'admin/suppliers/edit/:id',
        canActivate: [memberGuard],
        loadComponent: () => import('../inventory/components/supplier-form/supplier-form.component').then(m => m.SupplierFormComponent)
      },
      {
        path: 'profile/edit',
        loadComponent: () => import('../profile/components/profile-edit/profile-edit.component').then(m => m.ProfileEditComponent)
      },
      {
        path: 'notes',
        loadComponent: () => import('../notes/components/notes-list/notes-list.component').then(m => m.NotesListComponent)
      },
      {
        path: 'inventory',
        loadComponent: () => import('../inventory/components/product-list/product-list.component').then(m => m.ProductListComponent)
      },
      {
        path: 'inventory/create',
        loadComponent: () => import('../inventory/components/product-form/product-form.component').then(m => m.ProductFormComponent)
      },
      {
        path: 'inventory/edit/:id',
        loadComponent: () => import('../inventory/components/product-form/product-form.component').then(m => m.ProductFormComponent)
      }
    ]
  }
];

