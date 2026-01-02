import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';
import { AuthService, User } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-password-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './password-edit-modal.component.html'
})
export class PasswordEditModalComponent {
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() passwordUpdated = new EventEmitter<void>();

  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  loading = false;
  error: string = '';
  success: string = '';

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    public translationService: TranslationService
  ) {}

  closeModal(): void {
    this.passwordForm = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    this.error = '';
    this.success = '';
    this.close.emit();
  }

  savePassword(): void {
    this.error = '';
    this.success = '';

    // Validaciones
    if (!this.passwordForm.currentPassword || !this.passwordForm.currentPassword.trim()) {
      this.error = this.translationService.translate('profile.currentPasswordRequired');
      return;
    }

    if (!this.passwordForm.newPassword || !this.passwordForm.newPassword.trim()) {
      this.error = this.translationService.translate('profile.newPasswordRequired');
      return;
    }

    if (this.passwordForm.newPassword.length < 6) {
      this.error = this.translationService.translate('profile.passwordMinLength');
      return;
    }

    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.error = this.translationService.translate('profile.passwordsDoNotMatch');
      return;
    }

    this.loading = true;
    const currentUser = this.authService.currentUser;
    if (!currentUser) {
      this.error = this.translationService.translate('profile.userNotFound');
      this.loading = false;
      return;
    }

    const updateData = {
      currentPassword: this.passwordForm.currentPassword,
      newPassword: this.passwordForm.newPassword
    };

    this.http.put<User>(`${this.apiUrl}/users/${currentUser.id}`, updateData).subscribe({
      next: () => {
        this.loading = false;
        this.success = this.translationService.translate('profile.passwordUpdatedSuccessfully');
        this.passwordUpdated.emit();
        
        // Cerrar el modal después de un breve delay
        setTimeout(() => {
          this.closeModal();
        }, 1500);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || err.error?.error || this.translationService.translate('profile.errorUpdatingPassword');
      }
    });
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    if (this.isOpen) {
      this.closeModal();
    }
  }
}

