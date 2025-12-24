import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { TranslationService } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Input() sidebarOpen = false; // Para controlar visibilidad en desktop
  @Output() closeSidebar = new EventEmitter<void>();
  adminExpanded = false;
  private routerSubscription?: Subscription;

  constructor(
    private router: Router,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    // Verificar ruta inicial
    this.checkAdminRoute();
    
    // Expandir automáticamente si estamos en una ruta de admin
    this.routerSubscription = this.router.events
      .pipe(filter((event: any) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.checkAdminRoute();
      });
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  checkAdminRoute(): void {
    const url = this.router.url;
    if (url.startsWith('/admin/projects') || url.startsWith('/admin/statuses') || url.startsWith('/admin/teams')) {
      this.adminExpanded = true;
    }
  }

  toggleAdmin() {
    this.adminExpanded = !this.adminExpanded;
  }

  onLinkClick() {
    // Solo cerrar el sidebar en mobile/tablet, no en desktop
    if (window.innerWidth < 1024) {
      this.closeSidebar.emit();
    }
  }

  isAdminRouteActive(): boolean {
    const url = this.router.url;
    return url.startsWith('/admin/projects') || url.startsWith('/admin/statuses') || url.startsWith('/admin/teams');
  }
}

