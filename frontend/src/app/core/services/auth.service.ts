import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: string;
}

export interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadUserFromStorage();
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get accessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  get refreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  get companyId(): string | null {
    return localStorage.getItem('companyId') || this.extractCompanyIdFromHost();
  }

  private extractCompanyIdFromHost(): string | null {
    const host = window.location.hostname;
    const parts = host.split('.');
    
    // Si tiene más de 2 partes (ej: empresa1.projectflow.com) o es subdomain.localhost
    if (parts.length > 2 || (parts.length === 2 && parts[1] === 'localhost')) {
      return parts[0];
    }
    
    return null;
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, {
      email,
      password
    }).pipe(
      tap(response => {
        this.setAuthData(response);
      })
    );
  }

  register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    companyName: string;
    subdomain: string;
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, data).pipe(
      tap(response => {
        this.setAuthData(response);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('companyId');
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  getMe(): Observable<{ user: User }> {
    return this.http.get<{ user: User }>(`${this.apiUrl}/auth/me`).pipe(
      tap(response => {
        this.currentUserSubject.next(response.user);
        localStorage.setItem('user', JSON.stringify(response.user));
      })
    );
  }

  refreshAccessToken(): Observable<{ accessToken: string }> {
    const refreshToken = this.refreshToken;
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    return this.http.post<{ accessToken: string }>(`${this.apiUrl}/auth/refresh`, {
      refreshToken
    }).pipe(
      tap(response => {
        localStorage.setItem('accessToken', response.accessToken);
      })
    );
  }

  private setAuthData(response: AuthResponse): void {
    localStorage.setItem('accessToken', response.tokens.accessToken);
    localStorage.setItem('refreshToken', response.tokens.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.user));
    localStorage.setItem('companyId', response.user.companyId);
    this.currentUserSubject.next(response.user);
  }

  private loadUserFromStorage(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUserSubject.next(user);
      } catch (e) {
        console.error('Error loading user from storage', e);
      }
    }
  }

  isAuthenticated(): boolean {
    return !!this.accessToken && !!this.currentUser;
  }
}

