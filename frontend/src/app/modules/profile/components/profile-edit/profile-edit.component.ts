import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';
import { AuthService, User } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { PasswordEditModalComponent } from '../password-edit-modal/password-edit-modal.component';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TranslatePipe, PasswordEditModalComponent],
  templateUrl: './profile-edit.component.html'
})
export class ProfileEditComponent implements OnInit {
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;

  profileForm = {
    firstName: '',
    lastName: '',
    email: ''
  };
  showPasswordModal = false;
  loading = false;
  uploadingAvatar = false;
  error: string = '';
  success: string = '';
  avatarUrl: string | null = null;
  avatarPreview: string | null = null;
  selectedFile: File | null = null;

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    const currentUser = this.authService.currentUser;
    if (currentUser) {
      this.profileForm = {
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        email: currentUser.email || ''
      };
      
      // Cargar avatar si existe
      if ((currentUser as any).avatar) {
        const avatarPath = (currentUser as any).avatar;
        if (avatarPath.startsWith('http')) {
          this.avatarUrl = avatarPath;
        } else {
          const baseUrl = this.apiUrl.replace('/api', '');
          this.avatarUrl = `${baseUrl}${avatarPath}`;
        }
      }
      
      this.error = '';
      this.success = '';
    }
  }

  get userInitials(): string {
    const currentUser = this.authService.currentUser;
    if (currentUser) {
      return `${currentUser.firstName[0]}${currentUser.lastName[0]}`.toUpperCase();
    }
    return 'U';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validar que sea una imagen
      if (!file.type.startsWith('image/')) {
        this.error = this.translationService.translate('profile.invalidImageType');
        return;
      }
      
      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.error = this.translationService.translate('profile.imageTooLarge');
        return;
      }
      
      this.selectedFile = file;
      
      // Crear preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.avatarPreview = e.target.result;
      };
      reader.readAsDataURL(file);
      
      // Subir inmediatamente
      this.uploadAvatar();
    }
  }

  triggerFileInput(): void {
    this.fileInput?.nativeElement.click();
  }

  uploadAvatar(): void {
    if (!this.selectedFile) return;
    
    this.uploadingAvatar = true;
    this.error = '';
    
    const formData = new FormData();
    formData.append('avatar', this.selectedFile);
    
    const currentUser = this.authService.currentUser;
    if (!currentUser) {
      this.error = this.translationService.translate('profile.userNotFound');
      this.uploadingAvatar = false;
      return;
    }
    
    this.http.post(`${this.apiUrl}/users/${currentUser.id}/avatar`, formData, {
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.Response) {
          this.uploadingAvatar = false;
          const response = event.body;
          
          if (response && response.avatar) {
            const avatarPath = response.avatar;
            const baseUrl = this.apiUrl.replace('/api', '');
            this.avatarUrl = `${baseUrl}${avatarPath}`;
            this.avatarPreview = null;
            this.selectedFile = null;
            
            // Actualizar el usuario en el servicio de autenticación
            this.authService.getMe().subscribe({
              next: () => {
                this.success = this.translationService.translate('profile.avatarUpdatedSuccessfully');
                setTimeout(() => {
                  this.success = '';
                }, 3000);
              },
              error: (err) => {
                console.error('Error refreshing user data', err);
              }
            });
          }
        }
      },
      error: (err) => {
        this.uploadingAvatar = false;
        this.error = err.error?.message || err.error?.error || this.translationService.translate('profile.errorUpdatingAvatar');
        this.avatarPreview = null;
        this.selectedFile = null;
      }
    });
  }

  removeAvatar(): void {
    const currentUser = this.authService.currentUser;
    if (!currentUser) return;
    
    this.uploadingAvatar = true;
    this.error = '';
    
    this.http.delete(`${this.apiUrl}/users/${currentUser.id}/avatar`).subscribe({
      next: () => {
        this.uploadingAvatar = false;
        this.avatarUrl = null;
        this.avatarPreview = null;
        this.selectedFile = null;
        
        // Actualizar el usuario en el servicio de autenticación
        this.authService.getMe().subscribe({
          next: () => {
            this.success = this.translationService.translate('profile.avatarRemovedSuccessfully');
            setTimeout(() => {
              this.success = '';
            }, 3000);
          },
          error: (err) => {
            console.error('Error refreshing user data', err);
          }
        });
      },
      error: (err) => {
        this.uploadingAvatar = false;
        this.error = err.error?.message || err.error?.error || this.translationService.translate('profile.errorRemovingAvatar');
      }
    });
  }

  openPasswordModal(): void {
    this.showPasswordModal = true;
  }

  closePasswordModal(): void {
    this.showPasswordModal = false;
  }

  onPasswordUpdated(): void {
    // La contraseña se actualizó, el modal se cerrará automáticamente
  }

  saveProfile(): void {
    this.error = '';
    this.success = '';

    // Validaciones
    if (!this.profileForm.firstName || !this.profileForm.firstName.trim()) {
      this.error = this.translationService.translate('profile.firstNameRequired');
      return;
    }

    if (!this.profileForm.lastName || !this.profileForm.lastName.trim()) {
      this.error = this.translationService.translate('profile.lastNameRequired');
      return;
    }

    if (!this.profileForm.email || !this.profileForm.email.trim()) {
      this.error = this.translationService.translate('profile.emailRequired');
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.profileForm.email)) {
      this.error = this.translationService.translate('profile.invalidEmail');
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
      firstName: this.profileForm.firstName.trim(),
      lastName: this.profileForm.lastName.trim(),
      email: this.profileForm.email.trim()
    };

    this.http.put<User>(`${this.apiUrl}/users/${currentUser.id}`, updateData).subscribe({
      next: () => {
        this.loading = false;
        this.success = this.translationService.translate('profile.updatedSuccessfully');
        
        // Actualizar el usuario en el servicio de autenticación
        this.authService.getMe().subscribe({
          next: () => {
            // Limpiar el mensaje de éxito después de un breve delay
            setTimeout(() => {
              this.success = '';
            }, 3000);
          },
          error: (err) => {
            console.error('Error refreshing user data', err);
          }
        });
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || err.error?.error || this.translationService.translate('profile.errorUpdating');
      }
    });
  }
}

