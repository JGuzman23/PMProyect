import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { TranslationService } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

interface Agent {
  name: string;
  phone: string;
  email: string;
}

interface Task {
  _id: string;
  title: string;
  taskId?: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  clientId?: string | {
    _id: string;
    name: string;
  };
  projectId?: {
    _id: string;
    name: string;
  };
  boardId?: {
    _id: string;
    name: string;
  };
  assignees?: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  }>;
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
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './client-detail.component.html'
})
export class ClientDetailComponent implements OnInit {
  client: Client | null = null;
  tasks: Task[] = [];
  loading = true;
  clientId: string | null = null;

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.clientId = this.route.snapshot.paramMap.get('id');
    if (this.clientId) {
      this.loadClient();
      this.loadTasks();
    }
  }

  loadClient(): void {
    if (!this.clientId) return;
    
    this.loading = true;
    this.http.get<Client>(`${this.apiUrl}/clients/${this.clientId}`).subscribe({
      next: (client) => {
        this.client = client;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading client', err);
        this.loading = false;
      }
    });
  }

  loadTasks(): void {
    if (!this.clientId) return;

    this.http.get<Task[]>(`${this.apiUrl}/tasks`).subscribe({
      next: (allTasks) => {
        // Filtrar tareas que pertenecen a este cliente
        this.tasks = allTasks.filter(task => {
          if (!task.clientId) return false;
          const taskClientId = typeof task.clientId === 'string' ? task.clientId : task.clientId._id;
          return taskClientId === this.clientId;
        });
      },
      error: (err) => {
        console.error('Error loading tasks', err);
      }
    });
  }

  getPriorityClass(priority: string): string {
    const classes: { [key: string]: string } = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800'
    };
    return classes[priority] || 'bg-gray-100 text-gray-800';
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'todo': 'bg-gray-100 text-gray-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'review': 'bg-yellow-100 text-yellow-800',
      'done': 'bg-green-100 text-green-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'todo': 'Por hacer',
      'in-progress': 'En progreso',
      'review': 'Revisión',
      'done': 'Completada'
    };
    return statusMap[status] || status;
  }
}

