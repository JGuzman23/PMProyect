import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, SidebarComponent, NavbarComponent],
  templateUrl: './dashboard-layout.component.html'
})
export class DashboardLayoutComponent implements OnInit, OnDestroy {
  sidebarOpen = true; // Abierto por defecto en desktop

  ngOnInit(): void {
    // Restaurar el estado del sidebar desde localStorage
    const savedState = localStorage.getItem('sidebarOpen');
    if (savedState !== null) {
      this.sidebarOpen = savedState === 'true';
    }
    
    // Ocultar sidebar automáticamente en mobile/tablet al cargar
    this.checkScreenSize();
    
    // Guardar el estado inicial
    this.saveSidebarState();
  }

  ngOnDestroy(): void {
    // Guardar el estado antes de destruir el componente
    this.saveSidebarState();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.checkScreenSize();
  }

  checkScreenSize(): void {
    // Si es mobile o tablet (menor a 1024px = lg breakpoint de Tailwind)
    if (window.innerWidth < 1024) {
      // En mobile/tablet, no cambiar el estado si ya está guardado
      // Solo cerrar si no hay estado guardado
      const savedState = localStorage.getItem('sidebarOpen');
      if (savedState === null) {
        this.sidebarOpen = false;
      }
    } else {
      // En desktop, restaurar el estado guardado o mantener abierto por defecto
      const savedState = localStorage.getItem('sidebarOpen');
      if (savedState !== null) {
        this.sidebarOpen = savedState === 'true';
      } else {
        this.sidebarOpen = true;
      }
    }
    this.saveSidebarState();
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
    this.saveSidebarState();
  }

  closeSidebar() {
    // Solo cerrar en mobile/tablet, en desktop mantener el estado
    if (window.innerWidth < 1024) {
      this.sidebarOpen = false;
      this.saveSidebarState();
    }
  }

  private saveSidebarState(): void {
    localStorage.setItem('sidebarOpen', this.sidebarOpen.toString());
  }
}

