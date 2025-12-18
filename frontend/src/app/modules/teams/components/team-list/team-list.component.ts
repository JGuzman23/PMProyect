import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
}

@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
    role: 'member'
  };

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.http.get<User[]>(`${this.apiUrl}/users`).subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (err) => {
        console.error('Error loading users', err);
      }
    });
  }

  openCreateModal(): void {
    this.selectedUser = null;
    this.userForm = { firstName: '', lastName: '', email: '', password: '', role: 'member' };
    this.showModal = true;
  }

  editUser(user: User): void {
    this.selectedUser = user;
    this.userForm = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      role: user.role
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
    if (confirm('¿Estás seguro de eliminar este usuario?')) {
      this.http.delete(`${this.apiUrl}/users/${id}`).subscribe({
        next: () => {
          this.loadUsers();
        },
        error: (err) => console.error('Error deleting user', err)
      });
    }
  }

  getRoleLabel(role: string): string {
    const labels: { [key: string]: string } = {
      admin: 'Administrador',
      manager: 'Manager',
      member: 'Miembro'
    };
    return labels[role] || role;
  }

  getRoleClass(role: string): string {
    const classes: { [key: string]: string } = {
      admin: 'bg-purple-100 text-purple-800',
      manager: 'bg-blue-100 text-blue-800',
      member: 'bg-gray-100 text-gray-800'
    };
    return classes[role] || classes['member'];
  }
}

