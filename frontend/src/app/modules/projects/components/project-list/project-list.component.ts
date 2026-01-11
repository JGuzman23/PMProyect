import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { TranslationService } from '../../../../core/services/translation.service';

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
  imports: [CommonModule, FormsModule, TranslatePipe],
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

  constructor(
    private http: HttpClient,
    public translationService: TranslationService
  ) {}

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
      this.error = this.translationService.translate('projects.nameRequired');
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
          this.error = err.error?.error || err.error?.message || this.translationService.translate('projects.errorUpdating');
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
          this.error = err.error?.error || err.error?.message || this.translationService.translate('projects.errorCreating');
        }
      });
    }
  }

  deleteProject(id: string): void {
    if (!confirm(this.translationService.translate('projects.confirmDelete'))) {
      return;
    }

    this.http.delete(`${this.apiUrl}/projects/${id}`).subscribe({
      next: () => {
        this.loadProjects();
      },
      error: (err) => {
        console.error('Error deleting project', err);
        alert(this.translationService.translate('projects.errorDeleting'));
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
    return this.translationService.translate(`projects.status.${status}`) || status;
  }
}

