import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';

interface Project {
  _id: string;
  name: string;
}

interface BoardStatus {
  _id: string;
  name: string;
  color: string;
  isDefault: boolean;
  order: number;
  projectId: {
    _id: string;
    name: string;
  };
}

@Component({
  selector: 'app-status-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './status-admin.component.html'
})
export class StatusAdminComponent implements OnInit {
  statuses: BoardStatus[] = [];
  projects: Project[] = [];
  selectedProjectId: string = '';
  showStatusModal = false;
  selectedStatus: BoardStatus | null = null;
  statusForm = { name: '', color: '#94A3B8', isDefault: false, order: 0, projectId: '' };
  error = '';

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadProjects();
    this.loadStatuses();
  }

  loadProjects(): void {
    this.http.get<Project[]>(`${this.apiUrl}/projects`).subscribe({
      next: (projects) => {
        this.projects = projects;
        if (projects.length > 0 && !this.selectedProjectId) {
          this.selectedProjectId = projects[0]._id;
          this.loadStatuses();
        }
      },
      error: (err) => console.error('Error loading projects', err)
    });
  }

  onProjectChange(): void {
    this.loadStatuses();
  }

  loadStatuses(): void {
    const url = this.selectedProjectId 
      ? `${this.apiUrl}/admin/statuses?projectId=${this.selectedProjectId}`
      : `${this.apiUrl}/admin/statuses`;
    this.http.get<BoardStatus[]>(url).subscribe({
      next: (statuses) => {
        this.statuses = statuses;
      },
      error: (err) => console.error('Error loading statuses', err)
    });
  }

  openStatusModal(): void {
    this.selectedStatus = null;
    this.statusForm = { 
      name: '', 
      color: '#94A3B8', 
      isDefault: false, 
      order: 0, 
      projectId: this.selectedProjectId || '' 
    };
    this.error = '';
    this.showStatusModal = true;
  }

  editStatus(status: BoardStatus): void {
    this.selectedStatus = status;
    this.statusForm = {
      name: status.name,
      color: status.color,
      isDefault: status.isDefault,
      order: status.order,
      projectId: status.projectId?._id || ''
    };
    this.error = '';
    this.showStatusModal = true;
  }

  closeStatusModal(): void {
    this.showStatusModal = false;
    this.selectedStatus = null;
    this.error = '';
  }

  saveStatus(): void {
    if (!this.statusForm.name) {
      this.error = 'El nombre del estado es requerido';
      return;
    }

    if (!this.statusForm.projectId) {
      this.error = 'Debes seleccionar un proyecto';
      return;
    }

    this.error = '';

    if (this.selectedStatus) {
      this.http.put(`${this.apiUrl}/admin/statuses/${this.selectedStatus._id}`, this.statusForm).subscribe({
        next: () => {
          this.loadStatuses();
          this.closeStatusModal();
        },
        error: (err) => {
          console.error('Error updating status', err);
          this.error = err.error?.error || err.error?.message || 'Error al actualizar el estado';
        }
      });
    } else {
      this.http.post(`${this.apiUrl}/admin/statuses`, this.statusForm).subscribe({
        next: () => {
          this.loadStatuses();
          this.closeStatusModal();
        },
        error: (err) => {
          console.error('Error creating status', err);
          this.error = err.error?.error || err.error?.message || 'Error al crear el estado';
        }
      });
    }
  }

  deleteStatus(id: string): void {
    if (confirm('¿Estás seguro de eliminar este estado?')) {
      this.http.delete(`${this.apiUrl}/admin/statuses/${id}`).subscribe({
        next: () => {
          this.loadStatuses();
        },
        error: (err) => console.error('Error deleting status', err)
      });
    }
  }
}




