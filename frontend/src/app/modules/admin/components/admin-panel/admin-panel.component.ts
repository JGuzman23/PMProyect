import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';

interface Label {
  _id: string;
  name: string;
  color: string;
}

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
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-panel.component.html'
})
export class AdminPanelComponent implements OnInit {
  labels: Label[] = [];
  statuses: BoardStatus[] = [];
  projects: Project[] = [];
  selectedProjectId: string = '';
  showLabelModal = false;
  showStatusModal = false;
  selectedLabel: Label | null = null;
  selectedStatus: BoardStatus | null = null;
  labelForm = { name: '', color: '#3B82F6' };
  statusForm = { name: '', color: '#94A3B8', isDefault: false, order: 0, projectId: '' };
  error = '';

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadLabels();
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

  loadLabels(): void {
    this.http.get<Label[]>(`${this.apiUrl}/admin/labels`).subscribe({
      next: (labels) => {
        this.labels = labels;
      },
      error: (err) => console.error('Error loading labels', err)
    });
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

  openLabelModal(): void {
    this.selectedLabel = null;
    this.labelForm = { name: '', color: '#3B82F6' };
    this.showLabelModal = true;
  }

  editLabel(label: Label): void {
    this.selectedLabel = label;
    this.labelForm = { name: label.name, color: label.color };
    this.showLabelModal = true;
  }

  closeLabelModal(): void {
    this.showLabelModal = false;
    this.selectedLabel = null;
  }

  saveLabel(): void {
    if (this.selectedLabel) {
      this.http.put(`${this.apiUrl}/admin/labels/${this.selectedLabel._id}`, this.labelForm).subscribe({
        next: () => {
          this.loadLabels();
          this.closeLabelModal();
        },
        error: (err) => console.error('Error updating label', err)
      });
    } else {
      this.http.post(`${this.apiUrl}/admin/labels`, this.labelForm).subscribe({
        next: () => {
          this.loadLabels();
          this.closeLabelModal();
        },
        error: (err) => console.error('Error creating label', err)
      });
    }
  }

  deleteLabel(id: string): void {
    if (confirm('¿Estás seguro de eliminar esta etiqueta?')) {
      this.http.delete(`${this.apiUrl}/admin/labels/${id}`).subscribe({
        next: () => {
          this.loadLabels();
        },
        error: (err) => console.error('Error deleting label', err)
      });
    }
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
