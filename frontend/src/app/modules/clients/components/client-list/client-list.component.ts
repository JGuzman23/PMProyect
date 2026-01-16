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
  phone?: string;
  phones?: string[];
  company?: string;
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

  // Sorting
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // Export
  exportFormat: 'csv' | 'excel' = 'csv';

  // Expanded rows
  expandedRows: Set<string> = new Set();

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
        this.applySorting();
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
      this.applySorting();
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
      
      // Buscar por teléfonos
      const phones = client.phones || (client.phone ? [client.phone] : []);
      const phoneMatch = phones.some(phone => phone && phone.toLowerCase().includes(searchLower));

      // Buscar por empresa (si es tipo empresa)
      const company = client.company ? client.company.toLowerCase() : '';
      
      // Buscar por documento
      const document = client.documentNumber ? client.documentNumber.toLowerCase() : '';

      // Buscar por agentes (PMs) asignados
      let agentMatch = false;
      if (client.agents && client.agents.length > 0) {
        agentMatch = client.agents.some(agent => {
          const agentName = agent.name ? agent.name.toLowerCase() : '';
          const agentEmail = agent.email ? agent.email.toLowerCase() : '';
          const agentPhone = agent.phone ? agent.phone.toLowerCase() : '';
          return agentName.includes(searchLower) ||
                 agentEmail.includes(searchLower) ||
                 agentPhone.includes(searchLower);
        });
      }

      return fullName.includes(searchLower) ||
             email.includes(searchLower) ||
             phoneMatch ||
             company.includes(searchLower) ||
             document.includes(searchLower) ||
             agentMatch;
    });
    
    this.currentPage = 1;
    this.applySorting();
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

    this.filteredClients.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (this.sortColumn) {
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'name':
          aValue = a.type === 'persona' && a.lastName 
            ? `${a.name} ${a.lastName}`.toLowerCase()
            : a.name.toLowerCase();
          bValue = b.type === 'persona' && b.lastName 
            ? `${b.name} ${b.lastName}`.toLowerCase()
            : b.name.toLowerCase();
          break;
        case 'email':
          aValue = (a.email || '').toLowerCase();
          bValue = (b.email || '').toLowerCase();
          break;
        case 'phone':
          const aPhones = a.phones || (a.phone ? [a.phone] : []);
          const bPhones = b.phones || (b.phone ? [b.phone] : []);
          aValue = (aPhones[0] || '').toLowerCase();
          bValue = (bPhones[0] || '').toLowerCase();
          break;
        case 'company':
          aValue = (a.company || '').toLowerCase();
          bValue = (b.company || '').toLowerCase();
          break;
        case 'status':
          aValue = a.isActive ? 1 : 0;
          bValue = b.isActive ? 1 : 0;
          break;
        default:
          return 0;
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

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) {
      // Icono de ordenamiento neutro (sin ordenar)
      return 'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4';
    }
    // Icono de ordenamiento activo
    return this.sortDirection === 'asc' 
      ? 'M5 15l7-7 7 7'  // Flecha arriba
      : 'M19 9l-7 7-7-7'; // Flecha abajo
  }

  isSorted(column: string): boolean {
    return this.sortColumn === column;
  }

  toggleExpand(clientId: string): void {
    if (this.expandedRows.has(clientId)) {
      this.expandedRows.delete(clientId);
    } else {
      this.expandedRows.add(clientId);
    }
  }

  isExpanded(clientId: string): boolean {
    return this.expandedRows.has(clientId);
  }

  exportToCSV(): void {
    const headers = [
      this.translationService.translate('clients.type'),
      this.translationService.translate('clients.name'),
      this.translationService.translate('tasks.email'),
      this.translationService.translate('tasks.phone'),
      this.translationService.translate('clients.companyInfo'),
      this.translationService.translate('clients.status')
    ];

    const rows = this.filteredClients.map(client => {
      const name = client.type === 'persona' && client.lastName 
        ? `${client.name} ${client.lastName}`
        : client.name;
      const type = client.type === 'empresa' 
        ? this.translationService.translate('clients.company')
        : this.translationService.translate('clients.person');
      const companyInfo = client.type === 'empresa' 
        ? (client.company || '')
        : (client.documentNumber ? `${client.documentType}: ${client.documentNumber}` : '');
      const status = client.isActive 
        ? this.translationService.translate('clients.active')
        : this.translationService.translate('clients.inactive');

      const phones = client.phones || (client.phone ? [client.phone] : []);
      const phoneDisplay = phones.filter(p => p && p.trim()).join(', ') || '';

      return [
        type,
        name,
        client.email || '',
        phoneDisplay,
        companyInfo,
        status
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportToPDF(): void {
    // Crear una ventana nueva para el PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert(this.translationService.translate('clients.pdfBlocked') || 'Por favor, permite las ventanas emergentes para exportar PDF');
      return;
    }

    const headers = [
      this.translationService.translate('clients.type'),
      this.translationService.translate('clients.name'),
      this.translationService.translate('tasks.email'),
      this.translationService.translate('tasks.phone'),
      this.translationService.translate('clients.companyInfo'),
      this.translationService.translate('clients.status')
    ];

    const rows = this.filteredClients.map(client => {
      const name = client.type === 'persona' && client.lastName 
        ? `${client.name} ${client.lastName}`
        : client.name;
      const type = client.type === 'empresa' 
        ? this.translationService.translate('clients.company')
        : this.translationService.translate('clients.person');
      const companyInfo = client.type === 'empresa' 
        ? (client.company || '')
        : (client.documentNumber ? `${client.documentType}: ${client.documentNumber}` : '');
      const status = client.isActive 
        ? this.translationService.translate('clients.active')
        : this.translationService.translate('clients.inactive');

      const phones = client.phones || (client.phone ? [client.phone] : []);
      const phoneDisplay = phones.filter(p => p && p.trim()).join(', ') || '';

      return [
        type,
        name,
        client.email || '',
        phoneDisplay,
        companyInfo,
        status
      ];
    });

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${this.translationService.translate('clients.title')}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      font-size: 12px;
    }
    h1 {
      text-align: center;
      color: #1f2937;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      padding: 8px;
      text-align: left;
      font-weight: bold;
    }
    td {
      border: 1px solid #e5e7eb;
      padding: 8px;
    }
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    .footer {
      margin-top: 20px;
      text-align: center;
      color: #6b7280;
      font-size: 10px;
    }
    @media print {
      @page {
        margin: 1cm;
      }
      body {
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <h1>${this.translationService.translate('clients.title')}</h1>
  <p><strong>${this.translationService.translate('clients.showing')} ${this.filteredClients.length} ${this.translationService.translate('clients.results')}</strong></p>
  <table>
    <thead>
      <tr>
        ${headers.map(h => `<th>${this.escapeHtml(h)}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${rows.map(row => `<tr>${row.map(cell => `<td>${this.escapeHtml(String(cell))}</td>`).join('')}</tr>`).join('')}
    </tbody>
  </table>
  <div class="footer">
    ${this.translationService.translate('clients.exportedOn')} ${new Date().toLocaleString()}
  </div>
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  escapeHtml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&#39;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }
}

