import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';
import { TranslationService } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

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
  imports: [CommonModule, RouterLink, TranslatePipe, FormsModule],
  templateUrl: './client-list.component.html'
})
export class ClientListComponent implements OnInit {
  clients: Client[] = [];
  filteredClients: Client[] = [];
  paginatedClients: Client[] = [];
  searchTerm: string = '';
  
  // Paginación
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(): void {
    this.http.get<Client[]>(`${this.apiUrl}/clients`).subscribe({
      next: (clients) => {
        this.clients = clients;
        this.filteredClients = clients;
        this.updatePagination();
      },
      error: (err) => {
        console.error('Error loading clients', err);
      }
    });
  }

  onSearchChange(): void {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredClients = this.clients;
      this.currentPage = 1;
      this.updatePagination();
      return;
    }

    const searchLower = this.searchTerm.toLowerCase().trim();
    this.filteredClients = this.clients.filter(client => {
      // Buscar por nombre
      const fullName = client.type === 'persona' && client.lastName
        ? `${client.name} ${client.lastName}`.toLowerCase()
        : client.name.toLowerCase();
      
      // Buscar por email
      const email = client.email ? client.email.toLowerCase() : '';
      
      // Buscar por teléfono
      const phone = client.phone ? client.phone.toLowerCase() : '';
      
      // Buscar por empresa (si es tipo empresa)
      const company = client.company ? client.company.toLowerCase() : '';
      
      // Buscar por documento
      const document = client.documentNumber ? client.documentNumber.toLowerCase() : '';
      
      // Buscar por NIF/CIF (taxId)
      const taxId = client.taxId ? client.taxId.toLowerCase() : '';

      return fullName.includes(searchLower) ||
             email.includes(searchLower) ||
             phone.includes(searchLower) ||
             company.includes(searchLower) ||
             document.includes(searchLower) ||
             taxId.includes(searchLower);
    });
    
    this.currentPage = 1;
    this.updatePagination();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filteredClients = this.clients;
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredClients.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedClients = this.filteredClients.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
      // Scroll to top of table
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get endIndex(): number {
    const end = this.currentPage * this.itemsPerPage;
    return end > this.filteredClients.length ? this.filteredClients.length : end;
  }

  getPagesArray(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  openCreateForm(): void {
    this.router.navigate(['/clients/create']);
  }

  editClient(client: Client): void {
    this.router.navigate(['/clients/edit', client._id]);
  }

  deleteClient(id: string): void {
    if (confirm(this.translationService.translate('clients.confirmDelete'))) {
      this.http.delete(`${this.apiUrl}/clients/${id}`).subscribe({
        next: () => {
          this.loadClients();
          // Ajustar página si es necesario
          if (this.paginatedClients.length === 0 && this.currentPage > 1) {
            this.currentPage--;
            this.updatePagination();
          }
        },
        error: (err) => console.error('Error deleting client', err)
      });
    }
  }
}

