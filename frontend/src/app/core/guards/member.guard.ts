import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const memberGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentUser = authService.currentUser;

  // Bloquear acceso si el usuario tiene el rol de "member"
  if (currentUser && currentUser.role === 'member') {
    router.navigate(['/']);
    return false;
  }

  // Permitir acceso a usuarios con otros roles (admin, manager)
  return true;
};
