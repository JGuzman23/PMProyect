import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from './components/dashboard-layout/dashboard-layout.component';

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
        path: 'admin',
        loadComponent: () => import('../admin/components/admin-panel/admin-panel.component').then(m => m.AdminPanelComponent)
      },
      {
        path: 'admin/projects',
        loadComponent: () => import('../projects/components/project-list/project-list.component').then(m => m.ProjectListComponent)
      },
      {
        path: 'admin/statuses',
        loadComponent: () => import('../admin/components/status-admin/status-admin.component').then(m => m.StatusAdminComponent)
      },
      {
        path: 'admin/teams',
        loadComponent: () => import('../teams/components/team-list/team-list.component').then(m => m.TeamListComponent)
      },
      {
        path: 'profile/edit',
        loadComponent: () => import('../profile/components/profile-edit/profile-edit.component').then(m => m.ProfileEditComponent)
      }
    ]
  }
];

