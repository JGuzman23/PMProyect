import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../../../environments/environment';

interface Agent {
  name: string;
  phone: string;
  email: string;
}

interface Client {
  _id: string;
  type: 'empresa' | 'persona';
  name: string;
  email: string;
  phone: string;
  company?: string;
  taxId?: string;
  website?: string;
  agents?: Agent[];
  lastName?: string;
  documentType?: string;
  documentNumber?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  notes?: string;
  isActive: boolean;
}

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './client-list.component.html'
})
export class ClientListComponent implements OnInit {
  clients: Client[] = [];

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(): void {
    this.http.get<Client[]>(`${this.apiUrl}/clients`).subscribe({
      next: (clients) => {
        this.clients = clients;
      },
      error: (err) => {
        console.error('Error loading clients', err);
      }
    });
  }

  openCreateForm(): void {
    this.router.navigate(['/clients/create']);
  }

  editClient(client: Client): void {
    this.router.navigate(['/clients/edit', client._id]);
  }

  deleteClient(id: string): void {
    if (confirm('¿Estás seguro de eliminar este cliente?')) {
      this.http.delete(`${this.apiUrl}/clients/${id}`).subscribe({
        next: () => {
          this.loadClients();
        },
        error: (err) => console.error('Error deleting client', err)
      });
    }
  }
}

