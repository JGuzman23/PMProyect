import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';
import { TranslationService } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

interface Supplier {
  _id: string;
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  notes?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, FormsModule],
  templateUrl: './supplier-list.component.html'
})
export class SupplierListComponent implements OnInit {
  suppliers: Supplier[] = [];
  filteredSuppliers: Supplier[] = [];
  paginatedSuppliers: Supplier[] = [];
  searchTerm: string = '';
  
  // Paginación
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;

  // Sorting
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // Expanded rows
  expandedRows: Set<string> = new Set();

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadSuppliers();
  }

  loadSuppliers(): void {
    const params: any = {};
    if (this.searchTerm) {
      params.search = this.searchTerm;
    }
    
    this.http.get<Supplier[]>(`${this.apiUrl}/inventory/suppliers`, { params }).subscribe({
      next: (suppliers) => {
        this.suppliers = suppliers;
        this.filteredSuppliers = suppliers;
        this.applySorting();
        this.updatePagination();
      },
      error: (err) => {
        console.error('Error loading suppliers', err);
      }
    });
  }

  onSearchChange(): void {
    this.loadSuppliers();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.loadSuppliers();
  }

  toggleRow(supplierId: string): void {
    if (this.expandedRows.has(supplierId)) {
      this.expandedRows.delete(supplierId);
    } else {
      this.expandedRows.add(supplierId);
    }
  }

  isRowExpanded(supplierId: string): boolean {
    return this.expandedRows.has(supplierId);
  }

  sort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applySorting();
    this.updatePagination();
  }

  applySorting(): void {
    if (!this.sortColumn) {
      return;
    }

    this.filteredSuppliers.sort((a, b) => {
      let aValue: any = a[this.sortColumn as keyof Supplier];
      let bValue: any = b[this.sortColumn as keyof Supplier];

      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredSuppliers.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedSuppliers = this.filteredSuppliers.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  deleteSupplier(supplierId: string): void {
    if (confirm(this.translationService.translate('admin.confirmDeleteSupplier') || '¿Estás seguro de eliminar este suplidor?')) {
      this.http.delete(`${this.apiUrl}/inventory/suppliers/${supplierId}`).subscribe({
        next: () => {
          this.loadSuppliers();
        },
        error: (err) => {
          console.error('Error deleting supplier', err);
          alert(this.translationService.translate('admin.errorDeletingSupplier') || 'Error al eliminar el suplidor');
        }
      });
    }
  }

  getMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  formatAddress(address?: { street?: string; city?: string; state?: string; zip?: string; country?: string }): string {
    if (!address) return '-';
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.zip) parts.push(address.zip);
    if (address.country) parts.push(address.country);
    return parts.length > 0 ? parts.join(', ') : '-';
  }
}
