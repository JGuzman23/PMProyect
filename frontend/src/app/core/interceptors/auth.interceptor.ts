import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.accessToken;
  const companyId = authService.companyId;

  let clonedReq = req;
  const headers: { [key: string]: string } = {};

  // Agregar token si existe
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Agregar X-Tenant-Id siempre que exista companyId (incluso en login/register)
  if (companyId) {
    headers['X-Tenant-Id'] = companyId;
  }

  // Solo clonar la request si hay headers para agregar
  if (Object.keys(headers).length > 0) {
    clonedReq = req.clone({
      setHeaders: headers
    });
  }

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/auth/refresh') && !req.url.includes('/auth/login')) {
        const refreshToken = authService.refreshToken;
        
        if (refreshToken) {
          return authService.refreshAccessToken().pipe(
            switchMap((response) => {
              const headers: { [key: string]: string } = {
                Authorization: `Bearer ${response.accessToken}`
              };
              
              if (companyId) {
                headers['X-Tenant-Id'] = companyId;
              }
              
              const newReq = req.clone({
                setHeaders: headers
              });
              return next(newReq);
            }),
            catchError((refreshError) => {
              authService.logout();
              router.navigate(['/auth/login']);
              return throwError(() => refreshError);
            })
          );
        } else {
          authService.logout();
          router.navigate(['/auth/login']);
        }
      }
      return throwError(() => error);
    })
  );
};







