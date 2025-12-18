import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface Company {
  _id: string;
  name: string;
  subdomain: string;
  plan: string;
  isActive: boolean;
  userCount?: number;
  projectCount?: number;
  taskCount?: number;
}

interface Stats {
  totalCompanies: number;
  activeCompanies: number;
  companies: Company[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  stats: Stats | null = null;
  showModal = false;
  selectedCompany: Company | null = null;
  companyForm = {
    name: '',
    subdomain: '',
    plan: 'free'
  };

  private apiUrl = 'http://localhost:3001/api';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.http.get<Stats>(`${this.apiUrl}/companies/stats`).subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: (err) => {
        console.error('Error loading stats', err);
      }
    });
  }

  openCreateModal(): void {
    this.selectedCompany = null;
    this.companyForm = { name: '', subdomain: '', plan: 'free' };
    this.showModal = true;
  }

  editCompany(company: Company): void {
    this.selectedCompany = company;
    this.companyForm = {
      name: company.name,
      subdomain: company.subdomain,
      plan: company.plan
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedCompany = null;
  }

  saveCompany(): void {
    if (this.selectedCompany) {
      this.http.put(`${this.apiUrl}/companies/${this.selectedCompany._id}`, this.companyForm).subscribe({
        next: () => {
          this.loadStats();
          this.closeModal();
        },
        error: (err) => console.error('Error updating company', err)
      });
    } else {
      this.http.post(`${this.apiUrl}/companies`, this.companyForm).subscribe({
        next: () => {
          this.loadStats();
          this.closeModal();
        },
        error: (err) => console.error('Error creating company', err)
      });
    }
  }

  toggleActive(company: Company): void {
    this.http.patch(`${this.apiUrl}/companies/${company._id}/toggle-active`, {}).subscribe({
      next: () => {
        this.loadStats();
      },
      error: (err) => console.error('Error toggling company', err)
    });
  }

  deleteCompany(id: string): void {
    if (confirm('¿Estás seguro de eliminar esta empresa?')) {
      this.http.delete(`${this.apiUrl}/companies/${id}`).subscribe({
        next: () => {
          this.loadStats();
        },
        error: (err) => console.error('Error deleting company', err)
      });
    }
  }

  getPlanClass(plan: string): string {
    const classes: { [key: string]: string } = {
      free: 'bg-gray-100 text-gray-800',
      pro: 'bg-blue-100 text-blue-800',
      enterprise: 'bg-purple-100 text-purple-800'
    };
    return classes[plan] || classes['free'];
  }
}

