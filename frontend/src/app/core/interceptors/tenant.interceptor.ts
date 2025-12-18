import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const companyId = authService.companyId;

  // Agregar X-Tenant-Id a todas las peticiones excepto register
  // El login necesita el tenantId para funcionar
  if (companyId && !req.url.includes('/auth/register')) {
    const clonedReq = req.clone({
      setHeaders: {
        'X-Tenant-Id': companyId
      }
    });
    return next(clonedReq);
  }

  return next(req);
};

