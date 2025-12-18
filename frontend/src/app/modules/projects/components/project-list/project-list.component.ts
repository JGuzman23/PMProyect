import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

interface Project {
  _id: string;
  name: string;
  description: string;
  status: string;
  color: string;
  startDate?: string;
  endDate?: string;
  ownerId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  members: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  }>;
}

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-list.component.html'
})
export class ProjectListComponent implements OnInit {
  projects: Project[] = [];
  loading = true;
  showModal = false;
  error = '';
  selectedProject: Project | null = null;
  projectForm = {
    name: '',
    description: '',
    color: '#3B82F6'
  };

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading = true;
    this.http.get<Project[]>(`${this.apiUrl}/projects`).subscribe({
      next: (projects) => {
        this.projects = projects;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading projects', err);
        this.loading = false;
      }
    });
  }

  openCreateModal(): void {
    this.selectedProject = null;
    this.projectForm = {
      name: '',
      description: '',
      color: '#3B82F6'
    };
    this.error = '';
    this.showModal = true;
  }

  editProject(project: Project): void {
    this.selectedProject = project;
    this.projectForm = {
      name: project.name,
      description: project.description || '',
      color: project.color || '#3B82F6'
    };
    this.error = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedProject = null;
    this.projectForm = {
      name: '',
      description: '',
      color: '#3B82F6'
    };
    this.error = '';
  }

  saveProject(): void {
    if (!this.projectForm.name) {
      this.error = 'El nombre del proyecto es requerido';
      return;
    }

    this.error = '';

    if (this.selectedProject) {
      // Update
      this.http.put(`${this.apiUrl}/projects/${this.selectedProject._id}`, this.projectForm).subscribe({
        next: () => {
          this.loadProjects();
          this.closeModal();
        },
        error: (err) => {
          console.error('Error updating project', err);
          this.error = err.error?.error || err.error?.message || 'Error al actualizar el proyecto';
        }
      });
    } else {
      // Create
      this.http.post(`${this.apiUrl}/projects`, this.projectForm).subscribe({
        next: () => {
          this.loadProjects();
          this.closeModal();
        },
        error: (err) => {
          console.error('Error creating project', err);
          this.error = err.error?.error || err.error?.message || 'Error al crear el proyecto';
        }
      });
    }
  }

  deleteProject(id: string): void {
    if (!confirm('¿Estás seguro de que deseas eliminar este proyecto?')) {
      return;
    }

    this.http.delete(`${this.apiUrl}/projects/${id}`).subscribe({
      next: () => {
        this.loadProjects();
      },
      error: (err) => {
        console.error('Error deleting project', err);
        alert('Error al eliminar el proyecto');
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'completed':
        return 'Completado';
      case 'archived':
        return 'Archivado';
      default:
        return status;
    }
  }
}

