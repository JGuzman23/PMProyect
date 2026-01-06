import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { TranslationService } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  avatar?: string | null;
  position?: string | null;
}

@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, RouterLink],
  templateUrl: './team-list.component.html'
})
export class TeamListComponent implements OnInit {
  users: User[] = [];
  showModal = false;
  selectedUser: User | null = null;
  userForm = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'member',
    position: ''
  };
  avatarErrors: { [userId: string]: boolean } = {};
  avatarCache: { [userId: string]: string } = {}; // Cache for base64 avatars

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.http.get<User[]>(`${this.apiUrl}/users`).subscribe({
      next: (users) => {
        this.users = users;
        // Load avatars in base64 for all users
        users.forEach(user => {
          if (user.avatar && !user.avatar.startsWith('data:image/')) {
            this.loadAvatarBase64(user);
          } else if (user.avatar && user.avatar.startsWith('data:image/')) {
            // If already base64, cache it
            this.avatarCache[user._id] = user.avatar;
          }
        });
      },
      error: (err) => {
        console.error('Error loading users', err);
      }
    });
  }

  openCreateModal(): void {
    this.selectedUser = null;
    this.userForm = { firstName: '', lastName: '', email: '', password: '', role: 'member', position: '' };
    this.showModal = true;
  }

  editUser(user: User): void {
    this.selectedUser = user;
    this.userForm = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      role: user.role,
      position: user.position || ''
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedUser = null;
  }

  saveUser(): void {
    const data: any = { ...this.userForm };
    if (!data.password) {
      delete data.password;
    }

    if (this.selectedUser) {
      this.http.put(`${this.apiUrl}/users/${this.selectedUser._id}`, data).subscribe({
        next: () => {
          this.loadUsers();
          this.closeModal();
        },
        error: (err) => console.error('Error updating user', err)
      });
    } else {
      this.http.post(`${this.apiUrl}/users`, data).subscribe({
        next: () => {
          this.loadUsers();
          this.closeModal();
        },
        error: (err) => console.error('Error creating user', err)
      });
    }
  }

  deleteUser(id: string): void {
    const message = this.translationService.translate('teams.confirmDelete');
    if (confirm(message)) {
      this.http.delete(`${this.apiUrl}/users/${id}`).subscribe({
        next: () => {
          this.loadUsers();
        },
        error: (err) => console.error('Error deleting user', err)
      });
    }
  }

  getRoleLabel(role: string): string {
    return this.translationService.translate(`teams.role.${role}`);
  }

  getRoleClass(role: string): string {
    const classes: { [key: string]: string } = {
      admin: 'bg-purple-100 text-purple-800',
      manager: 'bg-blue-100 text-blue-800',
      member: 'bg-gray-100 text-gray-800'
    };
    return classes[role] || classes['member'];
  }

  getUserInitials(user: User): string {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }

  getAvatarUrl(user: User): string | null {
    if (this.avatarErrors[user._id]) {
      return null;
    }
    if (user.avatar) {
      const avatarPath = user.avatar;
      
      // If it's already a data URI (base64), use it directly
      if (avatarPath.startsWith('data:image/')) {
        this.avatarCache[user._id] = avatarPath;
        return avatarPath;
      }

      // Check cache first
      if (this.avatarCache[user._id]) {
        return this.avatarCache[user._id];
      }

      // Load avatar in base64 if not in cache
      this.loadAvatarBase64(user);
      
      // Return null while loading (will update when loaded)
      return null;
    }
    return null;
  }

  loadAvatarBase64(user: User): void {
    if (!user.avatar || this.avatarErrors[user._id] || this.avatarCache[user._id]) {
      return;
    }

    let filename: string | null = null;
    const avatarPath = user.avatar;

    // Extract filename from URL or path
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      filename = avatarPath.split('/').pop() || null;
    } else {
      filename = avatarPath.split('/').pop() || null;
    }

    if (!filename) {
      return;
    }

    // Fetch avatar as base64 from API
    this.http.get<{ image: string }>(`${this.apiUrl}/users/avatar/${filename}`).subscribe({
      next: (response) => {
        if (response.image) {
          this.avatarCache[user._id] = response.image;
          // Trigger change detection by updating the user object
          const userIndex = this.users.findIndex(u => u._id === user._id);
          if (userIndex !== -1) {
            this.users[userIndex] = { ...this.users[userIndex] };
          }
        }
      },
      error: (err) => {
        console.error('Error loading avatar:', err);
        this.avatarErrors[user._id] = true;
      }
    });
  }

  onAvatarError(userId: string): void {
    this.avatarErrors[userId] = true;
  }
}

