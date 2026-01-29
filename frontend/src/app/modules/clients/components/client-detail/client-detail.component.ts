import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { TranslationService } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { TaskModalComponent } from '../../../board/components/task-modal/task-modal.component';

interface Agent {
  name: string;
  phone: string;
  email: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Task {
  _id: string;
  title: string;
  taskId?: string;
  description: string;
  status?: string;
  priority: string;
  dueDate?: string;
  order: number;
  columnId?: string | { _id: string; name?: string };
  attachments?: any[];
  comments?: any[];
  activityLog?: any[];
  labels?: any[];
  clientId?: string | Client;
  projectId?: {
    _id: string;
    name: string;
  };
  boardId?: string | { _id: string; name?: string };
  assignees: User[];
  agentIds?: string[];
  agentNames?: string[];
}

interface Column {
  _id?: string;
  name: string;
  order: number;
  color: string;
  tasks: Task[];
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
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, TaskModalComponent],
  templateUrl: './client-detail.component.html'
})
export class ClientDetailComponent implements OnInit {
  client: Client | null = null;
  tasks: Task[] = [];
  loading = true;
  clientId: string | null = null;
  
  // Task Modal
  showTaskModal = false;
  selectedTask: Task | null = null;
  users: User[] = [];
  clients: Client[] = [];
  columns: Column[] = [];

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
      this.loadUsers();
      this.loadClients();
      this.loadColumns();
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

    this.http.get<any[]>(`${this.apiUrl}/tasks`).subscribe({
      next: (allTasks) => {
        // Filtrar tareas que pertenecen a este cliente y normalizar
        this.tasks = allTasks.filter(task => {
          if (!task.clientId) return false;
          const taskClientId = typeof task.clientId === 'string' ? task.clientId : task.clientId._id;
          return taskClientId === this.clientId;
        }).map(task => ({
          ...task,
          description: task.description || '',
          order: task.order || 0,
          assignees: task.assignees || []
        })) as Task[];
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

  getStatusClass(status?: string): string {
    if (!status) return 'bg-gray-100 text-gray-800';
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
    // Usar el locale del usuario basado en el idioma de la aplicación
    const date = new Date(dateString);
    // Detectar el locale del navegador o usar un valor por defecto
    const locale = navigator.language || 'es-ES';
    return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getStatusLabel(status?: string): string {
    if (!status) return '-';
    const statusMap: { [key: string]: string } = {
      'todo': 'Por hacer',
      'in-progress': 'En progreso',
      'review': 'Revisión',
      'done': 'Completada'
    };
    return statusMap[status] || status;
  }

  loadUsers(): void {
    this.http.get<User[]>(`${this.apiUrl}/users`).subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (err) => {
        console.error('Error loading users', err);
      }
    });
  }

  loadClients(): void {
    this.http.get<Client[]>(`${this.apiUrl}/clients`).subscribe({
      next: (clients) => {
        this.clients = clients;
      },
      error: (err) => {
        console.error('Error loading clients', err);
      }
    });
  }

  loadColumns(): void {
    // Cargar columnas básicas para el modal (pueden estar vacías)
    // El modal necesita las columnas pero no son críticas para solo ver la tarea
    // Crear columnas vacías con color por defecto para cumplir con la interfaz
    this.columns = [];
  }

  openTaskModal(task: Task): void {
    // Cargar la tarea completa desde el API
    this.http.get<any>(`${this.apiUrl}/tasks/${task._id}`).subscribe({
      next: (fullTask) => {
        // Normalizar la tarea para el modal
        const normalizedTask: Task = {
          ...fullTask,
          description: fullTask.description || '',
          order: fullTask.order || 0,
          assignees: fullTask.assignees ? fullTask.assignees.map((assignee: any) => {
            if (typeof assignee === 'string') {
              return this.users.find(u => u._id === assignee) || { _id: assignee, firstName: '', lastName: '', email: '' };
            }
            return assignee;
          }).filter((a: any) => a !== undefined) as User[] : []
        };
        this.selectedTask = normalizedTask;
        this.showTaskModal = true;
      },
      error: (err) => {
        console.error('Error loading task', err);
        // Si falla, normalizar la tarea que tenemos
        const normalizedTask: Task = {
          ...task,
          description: task.description || '',
          order: task.order || 0,
          assignees: task.assignees || []
        };
        this.selectedTask = normalizedTask;
        this.showTaskModal = true;
      }
    });
  }

  closeTaskModal(): void {
    this.showTaskModal = false;
    this.selectedTask = null;
  }

  onTaskModalSave(event: any): void {
    // Recargar tareas después de guardar
    this.loadTasks();
    this.closeTaskModal();
  }

  onTaskModalDelete(event: string): void {
    // Recargar tareas después de eliminar
    this.loadTasks();
    this.closeTaskModal();
  }

  onTaskUpdated(event: Task): void {
    // Actualizar la tarea en la lista
    const index = this.tasks.findIndex(t => t._id === event._id);
    if (index !== -1) {
      this.tasks[index] = event;
    }
  }
}

