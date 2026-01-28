import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';
import { TranslationService } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

interface Supplier {
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
}

interface Product {
  _id: string;
  name: string;
  description?: string;
  reference?: string;
  barcode?: string;
  unitOfMeasure: string;
  customUnit?: string;
  supplier?: Supplier;
  cost: number;
  price: number;
  stock: number;
  minStock?: number;
  maxStock?: number;
  location?: string;
  category?: string;
  brand?: string;
  isActive: boolean;
  image?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, FormsModule],
  templateUrl: './product-list.component.html'
})
export class ProductListComponent implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  paginatedProducts: Product[] = [];
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

  // Stock alerts
  lowStockProducts: Product[] = [];

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    const params: any = {};
    if (this.searchTerm) {
      params.search = this.searchTerm;
    }
    
    this.http.get<Product[]>(`${this.apiUrl}/inventory`, { params }).subscribe({
      next: (products) => {
        this.products = products;
        this.filteredProducts = products;
        this.checkLowStock();
        this.applySorting();
        this.updatePagination();
      },
      error: (err) => {
        console.error('Error loading products', err);
      }
    });
  }

  onSearchChange(): void {
    this.loadProducts();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.loadProducts();
  }

  checkLowStock(): void {
    this.lowStockProducts = this.products.filter(p => 
      p.isActive && p.minStock && p.stock <= p.minStock
    );
  }

  toggleRow(productId: string): void {
    if (this.expandedRows.has(productId)) {
      this.expandedRows.delete(productId);
    } else {
      this.expandedRows.add(productId);
    }
  }

  isRowExpanded(productId: string): boolean {
    return this.expandedRows.has(productId);
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

    this.filteredProducts.sort((a, b) => {
      let aValue: any = a[this.sortColumn as keyof Product];
      let bValue: any = b[this.sortColumn as keyof Product];

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
    this.totalPages = Math.ceil(this.filteredProducts.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedProducts = this.filteredProducts.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  deleteProduct(productId: string): void {
    if (confirm(this.translationService.translate('inventory.confirmDelete') || '¿Estás seguro de eliminar este producto?')) {
      this.http.delete(`${this.apiUrl}/inventory/${productId}`).subscribe({
        next: () => {
          this.loadProducts();
        },
        error: (err) => {
          console.error('Error deleting product', err);
          alert(this.translationService.translate('inventory.errorDeleting') || 'Error al eliminar el producto');
        }
      });
    }
  }

  getStockStatusClass(product: Product): string {
    if (!product.minStock) return 'text-gray-600';
    if (product.stock <= product.minStock) return 'text-red-600 font-semibold';
    if (product.maxStock && product.stock >= product.maxStock) return 'text-yellow-600';
    return 'text-green-600';
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  getUnitLabel(unit: string, customUnit?: string): string {
    if (unit === 'otro' && customUnit) {
      return customUnit;
    }
    const unitMap: { [key: string]: string } = {
      'unidad': 'Unidad',
      'kg': 'Kilogramo',
      'g': 'Gramo',
      'l': 'Litro',
      'ml': 'Mililitro',
      'm': 'Metro',
      'cm': 'Centímetro',
      'm²': 'Metro cuadrado',
      'm³': 'Metro cúbico',
      'caja': 'Caja',
      'paquete': 'Paquete'
    };
    return unitMap[unit] || unit;
  }

  getMin(a: number, b: number): number {
    return Math.min(a, b);
  }
}
