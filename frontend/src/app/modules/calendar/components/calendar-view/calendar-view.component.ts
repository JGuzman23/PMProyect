import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { TaskModalComponent } from '../../../board/components/task-modal/task-modal.component';

interface Attachment {
  url: string;
  name: string;
  title?: string;
  size: number;
  uploadedAt?: string;
  statusId?: string;
  statusName?: string;
  _id?: string;
}

interface BoardStatus {
  _id: string;
  name: string;
  color: string;
  projectId: string;
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Client {
  _id: string;
  type: 'empresa' | 'persona';
  name: string;
  email: string;
  phone: string;
  company?: string;
  agents?: any[];
  lastName?: string;
  isActive: boolean;
}

interface Column {
  _id?: string;
  name: string;
  order: number;
  color: string;
  tasks: Task[];
}

interface Task {
  _id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: string;
  assignees: User[];
  attachments?: Attachment[];
  columnId?: string;
  projectId?: string | { _id: string };
  clientId?: string | Client;
  agentIds?: string[];
  agentNames?: string[];
  labels?: any[];
  comments?: any[];
  activityLog?: any[];
  order: number;
}

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule, DatePipe, TaskModalComponent],
  templateUrl: './calendar-view.component.html'
})
export class CalendarViewComponent implements OnInit {
  viewMode: 'month' | 'week' = 'month';
  currentDate = new Date();
  tasks: Task[] = [];
  weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
  selectedTask: Task | null = null;
  showTaskModal = false;
  statuses: BoardStatus[] = [];
  columns: Column[] = [];
  users: User[] = [];
  clients: Client[] = [];
  private apiUrl = environment.apiUrl;
  staticFilesUrl = environment.apiUrl.replace('/api', '');

  get currentMonth(): Date {
    return new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
  }

  get weekStart(): Date {
    const date = new Date(this.currentDate);
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
  }

  get weekEnd(): Date {
    const date = new Date(this.weekStart);
    return new Date(date.setDate(date.getDate() + 6));
  }

  get weekDates(): Date[] {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(this.weekStart);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  }

  get calendarDays(): any[] {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: any[] = [];

    // Previous month days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({ date, isCurrentMonth: true });
    }

    // Next month days to fill the grid
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false });
    }

    return days;
  }

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadStatuses();
    this.loadUsers();
    this.loadClients();
    // Cargar tareas después de usuarios para poder normalizar assignees
    this.loadTasks();
  }

  loadStatuses(): void {
    // Cargar todos los estados de todos los proyectos
    this.http.get<BoardStatus[]>(`${this.apiUrl}/admin/statuses`).subscribe({
      next: (statuses) => {
        this.statuses = statuses;
        // Convertir statuses a columns para el modal
        this.columns = statuses.map(status => ({
          _id: status._id,
          name: status.name,
          order: 0,
          color: status.color,
          tasks: []
        })).sort((a, b) => a.order - b.order);
      },
      error: (err) => {
        console.error('Error loading statuses', err);
      }
    });
  }

  loadUsers(): void {
    this.http.get<User[]>(`${this.apiUrl}/users`).subscribe({
      next: (users) => {
        this.users = users;
        // Recargar tareas para normalizar assignees ahora que tenemos los usuarios
        if (this.tasks.length > 0) {
          this.loadTasks();
        }
      },
      error: (err) => {
        console.error('Error loading users', err);
      }
    });
  }

  loadClients(): void {
    this.http.get<Client[]>(`${this.apiUrl}/clients`).subscribe({
      next: (clients) => {
        this.clients = clients.filter(c => c.isActive);
      },
      error: (err) => {
        console.error('Error loading clients', err);
      }
    });
  }

  loadTasks(): void {
    this.http.get<Task[]>(`${this.apiUrl}/tasks`).subscribe({
      next: (tasks) => {
        // Normalizar URLs de attachments y convertir assignees de strings a objetos User
        this.tasks = tasks.filter(t => t.dueDate).map(task => {
          // Convertir assignees de strings a objetos User si es necesario
          const normalizedAssignees = (task.assignees || []).map(assignee => {
            if (typeof assignee === 'string') {
              return this.users.find(u => u._id === assignee) || assignee;
            }
            return assignee;
          }).filter(a => a !== undefined) as User[];

          return {
            ...task,
            order: task.order || 0,
            assignees: normalizedAssignees,
            attachments: (task.attachments || []).map(att => ({
              ...att,
              size: att.size || 0,
              url: att.url && !att.url.startsWith('http') && !att.url.startsWith('data:') && att.url.startsWith('/')
                ? `${this.staticFilesUrl}${att.url}`
                : att.url || ''
            }))
          };
        });
      },
      error: (err) => {
        console.error('Error loading tasks', err);
      }
    });
  }

  getTasksForDate(date: Date): Task[] {
    return this.tasks.filter(task => {
      const taskDate = new Date(task.dueDate);
      return taskDate.toDateString() === date.toDateString();
    });
  }

  getTasksForDateAndHour(date: Date, hour: string): Task[] {
    return this.tasks.filter(task => {
      const taskDate = new Date(task.dueDate);
      const taskHour = taskDate.getHours().toString().padStart(2, '0') + ':00';
      return taskDate.toDateString() === date.toDateString() && taskHour === hour;
    });
  }

  previousMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
  }

  nextMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
  }

  previousWeek(): void {
    this.currentDate = new Date(this.currentDate.setDate(this.currentDate.getDate() - 7));
  }

  nextWeek(): void {
    this.currentDate = new Date(this.currentDate.setDate(this.currentDate.getDate() + 7));
  }

  openTaskModal(task: Task): void {
    // Asegurarse de que la tarea tenga el formato correcto para el modal
    // Normalizar assignees si es necesario y asegurar que order existe
    const normalizedTask: Task = {
      ...task,
      order: task.order || 0,
      assignees: task.assignees.map(assignee => {
        if (typeof assignee === 'string') {
          return this.users.find(u => u._id === assignee) || { _id: assignee, firstName: '', lastName: '', email: '' };
        }
        return assignee;
      }).filter(a => a !== undefined) as User[]
    };
    this.selectedTask = normalizedTask;
    this.showTaskModal = true;
  }

  closeTaskModal(): void {
    this.showTaskModal = false;
    this.selectedTask = null;
  }

  onTaskModalSave(taskFormData: any): void {
    // El modal maneja el guardado internamente
    this.loadTasks(); // Recargar tareas después de guardar
  }

  onTaskModalDelete(taskId: string): void {
    this.http.delete(`${this.apiUrl}/tasks/${taskId}`).subscribe({
      next: () => {
        this.loadTasks(); // Recargar tareas después de eliminar
        this.closeTaskModal();
      },
      error: (err) => {
        console.error('Error deleting task', err);
      }
    });
  }

  onTaskUpdated(updatedTask: any): void {
    // Normalizar la tarea actualizada para que coincida con nuestro tipo Task
    const normalizedTask: Task = {
      _id: updatedTask._id,
      title: updatedTask.title || '',
      description: updatedTask.description || '',
      dueDate: updatedTask.dueDate || '',
      priority: updatedTask.priority || 'medium',
      order: updatedTask.order || 0,
      assignees: (updatedTask.assignees || []).map((assignee: any) => {
        if (typeof assignee === 'string') {
          return this.users.find(u => u._id === assignee) || { _id: assignee, firstName: '', lastName: '', email: '' };
        }
        return assignee;
      }).filter((a: any) => a !== undefined) as User[],
      attachments: (updatedTask.attachments || []).map((att: any) => ({
        ...att,
        size: att.size || 0
      })),
      columnId: updatedTask.columnId,
      projectId: updatedTask.projectId,
      clientId: updatedTask.clientId,
      agentIds: updatedTask.agentIds,
      agentNames: updatedTask.agentNames,
      labels: updatedTask.labels,
      comments: updatedTask.comments,
      activityLog: updatedTask.activityLog
    };
    
    // Actualizar la tarea en la lista local
    const index = this.tasks.findIndex(t => t._id === normalizedTask._id);
    if (index !== -1) {
      this.tasks[index] = normalizedTask;
    }
    this.selectedTask = normalizedTask;
  }

  getTaskPreview(task: Task): string {
    if (!task.description) return '';
    // Remover HTML tags para mostrar solo texto
    const div = document.createElement('div');
    div.innerHTML = task.description;
    const text = div.textContent || div.innerText || '';
    return text.length > 50 ? text.substring(0, 50) + '...' : text;
  }

  getFirstImage(task: Task): string | null {
    if (!task.attachments || task.attachments.length === 0) return null;
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    const imageAttachment = task.attachments.find(att => {
      if (!att.name) return false;
      const ext = att.name.split('.').pop()?.toLowerCase();
      return ext && imageExtensions.includes(ext);
    });
    if (imageAttachment && imageAttachment.url) {
      const url = imageAttachment.url;
      // Si la URL ya está normalizada (contiene staticFilesUrl), devolverla tal cual
      if (url.includes(this.staticFilesUrl) || url.startsWith('http') || url.startsWith('data:')) {
        return url;
      }
      // Si es una ruta relativa, construir la URL completa
      if (url.startsWith('/')) {
        return `${this.staticFilesUrl}${url}`;
      }
      return url;
    }
    return null;
  }

  isImageFile(url: string, name: string): boolean {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    if (url && url.startsWith('data:image')) return true;
    if (url && /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(url)) return true;
    const ext = name.split('.').pop()?.toLowerCase();
    return ext ? imageExtensions.includes(ext) : false;
  }

  getPriorityLabel(priority: string): string {
    const labels: { [key: string]: string } = {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta',
      urgent: 'Urgente'
    };
    return labels[priority] || priority;
  }

  getPriorityClass(priority: string): string {
    const classes: { [key: string]: string } = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return classes[priority] || classes['medium'];
  }

  getTaskStatusColor(task: Task): string {
    if (!task.columnId) return '#818CF8'; // Color por defecto (indigo-400)
    
    // Buscar el estado que coincida con el columnId de la tarea
    const status = this.statuses.find(s => 
      s._id === task.columnId || 
      s.name === task.columnId ||
      (typeof task.columnId === 'object' && (task.columnId as any)._id === s._id)
    );
    
    return status?.color || '#818CF8'; // Color por defecto si no se encuentra
  }

  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none';
    }
  }
}
