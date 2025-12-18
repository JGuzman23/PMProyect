import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { Router } from '@angular/router';
import { LanguageSelectorComponent } from '../../../../core/components/language-selector/language-selector.component';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, LanguageSelectorComponent],
  templateUrl: './navbar.component.html'
})
export class NavbarComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  currentUser = this.authService.currentUser;

  get userInitials(): string {
    if (this.currentUser) {
      return `${this.currentUser.firstName[0]}${this.currentUser.lastName[0]}`.toUpperCase();
    }
    return 'U';
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    public translationService: TranslationService
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  logout(): void {
    this.authService.logout();
  }
}

