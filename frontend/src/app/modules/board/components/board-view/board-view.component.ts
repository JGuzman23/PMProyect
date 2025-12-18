import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

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
  phone: string;
  company?: string;
  agents?: Agent[];
  lastName?: string;
  isActive: boolean;
}

interface Attachment {
  url: string;
  name: string;
  size: number;
  uploadedAt?: string;
  _id?: string;
}

interface Comment {
  _id?: string;
  userId: User | string;
  text: string;
  createdAt?: string;
}

interface Label {
  _id: string;
  name: string;
  color: string;
}

interface Task {
  _id: string;
  title: string;
  description: string;
  assignees: User[];
  priority: string;
  dueDate?: string;
  order: number;
  columnId?: string;
  attachments?: Attachment[];
  comments?: Comment[];
  labels?: Label[];
  clientId?: string | Client;
  agentId?: string;
  agentName?: string;
}

interface Column {
  _id?: string;
  name: string;
  order: number;
  color: string;
  tasks: Task[];
}

interface Board {
  _id: string;
  name: string;
  description: string;
  projectId: {
    _id: string;
    name: string;
  };
  columns: Column[];
}

@Component({
  selector: 'app-board-view',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule],
  templateUrl: './board-view.component.html'
})
export class BoardViewComponent implements OnInit, OnDestroy {
  board: Board | null = null;
  columns: Column[] = [];
  users: User[] = [];
  clients: Client[] = [];
  loading = true;
  loadingUsers = false;
  loadingClients = false;
  showTaskModal = false;
  selectedTask: Task | null = null;
  selectedColumnIndex = 0;
  isDragging = false;
  showAssigneeDropdown = false;
  showTaskActionsDropdown = false;
  isEditMode = false;
  taskForm = {
    title: '',
    description: '',
    priority: 'medium',
    assignees: [] as string[],
    dueDate: '',
    clientId: '',
    agentId: '',
    agentName: ''
  };
  attachments: Attachment[] = [];
  uploadingFiles = false;
  comments: Comment[] = [];
  newCommentText: string = '';
  selectedClient: Client | null = null;

  private apiUrl = environment.apiUrl;
  boardId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.boardId = this.route.snapshot.paramMap.get('id') || '';
    this.loadBoard();
    this.loadUsers();
    this.loadClients();
  }

  loadUsers(): void {
    this.loadingUsers = true;
    this.http.get<User[]>(`${this.apiUrl}/users`).subscribe({
      next: (users) => {
        this.users = users;
        this.loadingUsers = false;
      },
      error: (err) => {
        console.error('Error loading users', err);
        this.loadingUsers = false;
      }
    });
  }

  loadClients(): void {
    this.loadingClients = true;
    this.http.get<Client[]>(`${this.apiUrl}/clients`).subscribe({
      next: (clients) => {
        this.clients = clients.filter(c => c.isActive);
        this.loadingClients = false;
      },
      error: (err) => {
        console.error('Error loading clients', err);
        this.loadingClients = false;
      }
    });
  }

  onClientChange(): void {
    if (this.taskForm.clientId) {
      this.selectedClient = this.clients.find(c => c._id === this.taskForm.clientId) || null;
      // Si cambia el cliente, limpiar agente seleccionado
      this.taskForm.agentId = '';
      this.taskForm.agentName = '';
    } else {
      this.selectedClient = null;
      this.taskForm.agentId = '';
      this.taskForm.agentName = '';
    }
  }

  onAgentChange(): void {
    if (this.selectedClient && this.selectedClient.type === 'empresa' && this.taskForm.agentId) {
      const agent = this.selectedClient.agents?.find((_, index) => index.toString() === this.taskForm.agentId);
      if (agent) {
        this.taskForm.agentName = agent.name;
      }
    }
  }

  loadBoard(): void {
    this.loading = true;
    this.http.get<Board>(`${this.apiUrl}/boards/${this.boardId}`).subscribe({
      next: (board) => {
        this.board = board;
        this.loadStatuses();
      },
      error: (err) => {
        console.error('Error loading board', err);
        this.loading = false;
      }
    });
  }

  loadStatuses(): void {
    if (!this.board?.projectId?._id) {
      // Si no hay proyecto, usar las columnas del board
      this.columns = this.board!.columns.map(col => ({ ...col, tasks: [] }));
      this.loadTasks();
      return;
    }

    // Cargar estados del proyecto
    this.http.get<any[]>(`${this.apiUrl}/admin/statuses?projectId=${this.board.projectId._id}`).subscribe({
      next: (statuses) => {
        if (statuses.length > 0) {
          // Usar los estados como columnas
          this.columns = statuses.map(status => ({
            _id: status._id,
            name: status.name,
            order: status.order || 0,
            color: status.color,
            tasks: []
          })).sort((a, b) => a.order - b.order);
        } else {
          // Si no hay estados, usar las columnas del board
          this.columns = this.board!.columns.map(col => ({ ...col, tasks: [] }));
        }
        this.loadTasks();
      },
      error: (err) => {
        console.error('Error loading statuses', err);
        // En caso de error, usar las columnas del board
        this.columns = this.board!.columns.map(col => ({ ...col, tasks: [] }));
        this.loadTasks();
      }
    });
  }

  loadTasks(): void {
    this.http.get<Task[]>(`${this.apiUrl}/tasks/board/${this.boardId}`).subscribe({
      next: (tasks) => {
        // Normalizar URLs de attachments
        tasks = tasks.map(task => ({
          ...task,
          attachments: task.attachments?.map(att => {
            let url = att.url || '';
            // Si la URL no es completa, construirla
            if (url && !url.startsWith('http') && !url.startsWith('data:') && url.startsWith('/')) {
              // Remover /api si está presente en apiUrl
              const baseUrl = this.apiUrl.replace('/api', '');
              url = `${baseUrl}${url}`;
            }
            return {
              ...att,
              url: url
            };
          }) || []
        }));
        // Asignar tareas a las columnas basándose en columnId
        this.columns = this.columns.map(col => ({
          ...col,
          tasks: tasks.filter(t => {
            // Buscar por _id o por name
            return t.columnId === col._id || t.columnId === col.name || 
                   (typeof t.columnId === 'object' && t.columnId === col._id);
          }).sort((a, b) => (a.order || 0) - (b.order || 0))
        }));
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading tasks', err);
        this.loading = false;
      }
    });
  }

  onDragStarted(): void {
    this.isDragging = true;
  }

  onDragEnded(): void {
    this.isDragging = false;
  }

  drop(event: CdkDragDrop<Task[]>, columnIndex: number): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }

    const task = event.container.data[event.currentIndex];
    const newColumnId = this.columns[columnIndex]._id || this.columns[columnIndex].name;

    this.http.patch(`${this.apiUrl}/tasks/${task._id}/move`, {
      columnId: newColumnId,
      order: event.currentIndex
    }).subscribe({
      next: () => {
        // Actualizar el orden de todas las tareas en la columna
        this.updateTaskOrders(columnIndex);
      },
      error: (err) => {
        console.error('Error moving task', err);
        this.loadTasks();
      }
    });
  }

  updateTaskOrders(columnIndex: number): void {
    const tasks = this.columns[columnIndex].tasks;
    tasks.forEach((task, index) => {
      if (task.order !== index) {
        this.http.patch(`${this.apiUrl}/tasks/${task._id}/move`, {
          columnId: this.columns[columnIndex]._id || this.columns[columnIndex].name,
          order: index
        }).subscribe({
          error: (err) => console.error('Error updating task order', err)
        });
      }
    });
  }

  openTaskModal(task?: Task): void {
    if (task) {
      this.selectedTask = task;
      const clientId = typeof task.clientId === 'object' ? task.clientId._id : task.clientId || '';
      this.taskForm = {
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        assignees: task.assignees ? task.assignees.map(a => typeof a === 'object' ? a._id : a) : [],
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        clientId: clientId,
        agentId: task.agentId || '',
        agentName: task.agentName || ''
      };
      if (clientId) {
        this.selectedClient = this.clients.find(c => c._id === clientId) || null;
      } else {
        this.selectedClient = null;
      }
      // Normalizar URLs de attachments
      this.attachments = (task.attachments || []).map(att => {
        let url = att.url || '';
        // Si la URL no es completa, construirla
        if (url && !url.startsWith('http') && !url.startsWith('data:') && url.startsWith('/')) {
          // Remover /api si está presente en apiUrl
          const baseUrl = this.apiUrl.replace('/api', '');
          url = `${baseUrl}${url}`;
        }
        return {
          ...att,
          url: url
        };
      });
      // Cargar comentarios
      this.comments = (task.comments || []).map(comment => ({
        ...comment,
        userId: typeof comment.userId === 'object' ? comment.userId : this.users.find(u => u._id === comment.userId) || comment.userId
      }));
      this.isEditMode = false; // Abrir en modo vista
    } else {
      this.selectedTask = null;
      this.taskForm = {
        title: '',
        description: '',
        priority: 'medium',
        assignees: [],
        dueDate: '',
        clientId: '',
        agentId: '',
        agentName: ''
      };
      this.selectedClient = null;
      this.attachments = [];
      this.comments = [];
      this.isEditMode = true; // Nueva tarea se abre en modo edición
    }
    this.newCommentText = '';
    this.showTaskModal = true;
    // Update editor content after modal is shown (sin binding para evitar que el cursor se mueva)
    setTimeout(() => {
      const editor = document.querySelector('.description-editor') as HTMLElement;
      if (editor && !editor.innerHTML) {
        editor.innerHTML = this.taskForm.description || '';
      }
    }, 0);
  }

  enableEditMode(): void {
    this.isEditMode = true;
    // Update editor content when switching to edit mode
    setTimeout(() => {
      const editor = document.querySelector('.description-editor') as HTMLElement;
      if (editor) {
        editor.innerHTML = this.taskForm.description || '';
      }
    }, 0);
  }

  cancelEdit(): void {
    if (this.selectedTask) {
      // Restaurar valores originales
      const clientId = typeof this.selectedTask.clientId === 'object' ? this.selectedTask.clientId._id : this.selectedTask.clientId || '';
      this.taskForm = {
        title: this.selectedTask.title,
        description: this.selectedTask.description || '',
        priority: this.selectedTask.priority,
        assignees: this.selectedTask.assignees ? this.selectedTask.assignees.map(a => typeof a === 'object' ? a._id : a) : [],
        dueDate: this.selectedTask.dueDate ? new Date(this.selectedTask.dueDate).toISOString().split('T')[0] : '',
        clientId: clientId,
        agentId: this.selectedTask.agentId || '',
        agentName: this.selectedTask.agentName || ''
      };
      if (clientId) {
        this.selectedClient = this.clients.find(c => c._id === clientId) || null;
      } else {
        this.selectedClient = null;
      }
      this.attachments = this.selectedTask.attachments || [];
      this.isEditMode = false;
    }
  }

  openCreateTaskModal(columnIndex: number): void {
    this.selectedColumnIndex = columnIndex;
    this.openTaskModal();
  }

  closeTaskModal(): void {
    this.showTaskModal = false;
    this.selectedTask = null;
    this.selectedClient = null;
    this.showAssigneeDropdown = false;
    this.showTaskActionsDropdown = false;
    this.isEditMode = false;
    this.attachments = [];
    this.comments = [];
    this.newCommentText = '';
  }

  onDescriptionChange(event: Event): void {
    const target = event.target as HTMLElement;
    // Solo actualizar el modelo sin causar re-render
    // No actualizamos innerHTML aquí para evitar que el cursor se mueva
    this.taskForm.description = target.innerHTML || '';
  }

  updateDescription(event: Event): void {
    const target = event.target as HTMLElement;
    this.taskForm.description = target.innerHTML || '';
  }

  formatText(command: string, event?: Event, value?: string): void {
    if (event) {
      event.preventDefault();
    }
    const editor = document.querySelector('.description-editor') as HTMLElement;
    if (editor) {
      editor.focus();
      if (value) {
        document.execCommand(command, false, value);
      } else {
        document.execCommand(command, false);
      }
      // Update form value after formatting
      this.taskForm.description = editor.innerHTML;
    }
  }

  formatHeading(tag: string, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    const editor = document.querySelector('.description-editor') as HTMLElement;
    if (editor) {
      editor.focus();
      document.execCommand('formatBlock', false, tag);
      this.taskForm.description = editor.innerHTML;
    }
  }

  insertLink(event: Event): void {
    if (event) {
      event.preventDefault();
    }
    const url = prompt('Ingresa la URL del enlace:');
    if (url) {
      const editor = document.querySelector('.description-editor') as HTMLElement;
      if (editor) {
        editor.focus();
        document.execCommand('createLink', false, url);
        this.taskForm.description = editor.innerHTML;
      }
    }
  }

  setTextColor(event: Event): void {
    const input = event.target as HTMLInputElement;
    const color = input.value;
    const editor = document.querySelector('.description-editor') as HTMLElement;
    if (editor) {
      editor.focus();
      document.execCommand('foreColor', false, color);
      this.taskForm.description = editor.innerHTML;
    }
  }

  removeFormat(event: Event): void {
    if (event) {
      event.preventDefault();
    }
    const editor = document.querySelector('.description-editor') as HTMLElement;
    if (editor) {
      editor.focus();
      document.execCommand('removeFormat', false);
      this.taskForm.description = editor.innerHTML;
    }
  }

  getSelectedAssignees(): User[] {
    return this.users.filter(u => this.taskForm.assignees.includes(u._id));
  }

  getClientName(clientId: string | Client | undefined): string {
    if (!clientId) return '';
    if (typeof clientId === 'object') {
      return clientId.name + (clientId.type === 'persona' && clientId.lastName ? ` ${clientId.lastName}` : '');
    }
    const client = this.clients.find(c => c._id === clientId);
    return client ? client.name + (client.type === 'persona' && client.lastName ? ` ${client.lastName}` : '') : '';
  }

  shouldShowAgent(): boolean {
    if (!this.selectedTask?.clientId || !this.selectedTask?.agentName) {
      return false;
    }
    if (typeof this.selectedTask.clientId === 'object') {
      return this.selectedTask.clientId.type === 'empresa';
    }
    const client = this.clients.find(c => c._id === this.selectedTask?.clientId);
    return client?.type === 'empresa';
  }

  getTaskClientName(task: Task): string {
    if (!task.clientId) return '';
    if (typeof task.clientId === 'object') {
      // Si es empresa, no mostrar el nombre del cliente
      if (task.clientId.type === 'empresa') {
        return '';
      }
      return task.clientId.name + (task.clientId.lastName ? ` ${task.clientId.lastName}` : '');
    }
    const client = this.clients.find(c => c._id === task.clientId);
    if (!client) return '';
    // Si es empresa, no mostrar el nombre del cliente
    if (client.type === 'empresa') {
      return '';
    }
    return client.name + (client.lastName ? ` ${client.lastName}` : '');
  }

  getTaskAgentName(task: Task): string {
    if (task.agentName) {
      return task.agentName;
    }
    return '';
  }

  getTaskClientType(task: Task): 'empresa' | 'persona' | null {
    if (!task.clientId) return null;
    if (typeof task.clientId === 'object') {
      return task.clientId.type;
    }
    const client = this.clients.find(c => c._id === task.clientId);
    return client?.type || null;
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

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  toggleAssignee(userId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const index = this.taskForm.assignees.indexOf(userId);
    if (index > -1) {
      this.taskForm.assignees.splice(index, 1);
    } else {
      this.taskForm.assignees.push(userId);
    }
  }

  isAssigneeSelected(userId: string): boolean {
    return this.taskForm.assignees.includes(userId);
  }

  getSelectedAssigneesNames(): string {
    if (this.taskForm.assignees.length === 0) {
      return 'Ninguno';
    }
    const selectedUsers = this.users.filter(u => this.taskForm.assignees.includes(u._id));
    if (selectedUsers.length === 0) {
      return 'Ninguno';
    }
    if (selectedUsers.length === 1) {
      return `${selectedUsers[0].firstName} ${selectedUsers[0].lastName}`;
    }
    return `${selectedUsers.length} usuarios seleccionados`;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.assignee-dropdown-container')) {
      this.showAssigneeDropdown = false;
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  saveTask(): void {
    const columnId = this.columns[this.selectedColumnIndex]._id || this.columns[this.selectedColumnIndex].name;
    const taskData: any = {
      title: this.taskForm.title,
      description: this.taskForm.description,
      priority: this.taskForm.priority,
      assignees: this.taskForm.assignees,
      dueDate: this.taskForm.dueDate || undefined,
      attachments: this.attachments,
      boardId: this.boardId,
      projectId: this.board!.projectId._id,
      columnId
    };

    // Agregar cliente si está seleccionado
    if (this.taskForm.clientId) {
      taskData.clientId = this.taskForm.clientId;
      
      // Si es empresa y hay agente seleccionado, agregar agente
      if (this.selectedClient?.type === 'empresa' && this.taskForm.agentId) {
        taskData.agentId = this.taskForm.agentId;
        taskData.agentName = this.taskForm.agentName;
      }
    }

    if (this.selectedTask) {
      this.http.put(`${this.apiUrl}/tasks/${this.selectedTask._id}`, taskData).subscribe({
        next: () => {
          this.loadTasks();
          this.isEditMode = false; // Volver a modo vista después de guardar
          // Recargar la tarea actualizada
          setTimeout(() => {
            this.loadTasks();
          }, 100);
        },
        error: (err) => console.error('Error updating task', err)
      });
    } else {
      this.http.post(`${this.apiUrl}/tasks`, taskData).subscribe({
        next: () => {
          this.loadTasks();
          this.closeTaskModal();
        },
        error: (err) => console.error('Error creating task', err)
      });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      // Si estamos en modo vista, activar modo edición para poder subir archivos
      if (!this.isEditMode && this.selectedTask) {
        this.enableEditMode();
      }
      Array.from(input.files).forEach(file => {
        this.uploadFile(file);
      });
      // Limpiar el input para permitir subir el mismo archivo de nuevo
      input.value = '';
    }
  }

  uploadFile(file: File): void {
    this.uploadingFiles = true;
    const formData = new FormData();
    formData.append('file', file);

    // Crear preview local mientras se sube
    const reader = new FileReader();
    const tempId = Date.now().toString();
    
    reader.onload = (e: any) => {
      const previewAttachment: Attachment = {
        url: e.target.result,
        name: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        _id: tempId
      };
      this.attachments.push(previewAttachment);
    };
    
    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else {
      // Para archivos no imagen, usar un placeholder
      const previewAttachment: Attachment = {
        url: '',
        name: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        _id: tempId
      };
      this.attachments.push(previewAttachment);
    }

    // Subir archivo al servidor
    this.http.post(`${this.apiUrl}/tasks/upload`, formData).subscribe({
      next: (response: any) => {
        // Actualizar el attachment con la URL del servidor
        const index = this.attachments.findIndex(a => a._id === tempId);
        if (index !== -1 && response.url) {
          let fullUrl = response.url;
          if (!fullUrl.startsWith('http') && !fullUrl.startsWith('data:')) {
            if (fullUrl.startsWith('/')) {
              // Remover /api si está presente en apiUrl
              const baseUrl = this.apiUrl.replace('/api', '');
              fullUrl = `${baseUrl}${fullUrl}`;
            } else {
              fullUrl = `${this.apiUrl}/${fullUrl}`;
            }
          }
          this.attachments[index] = {
            url: fullUrl,
            name: response.name || file.name,
            size: response.size || file.size,
            uploadedAt: response.uploadedAt || new Date().toISOString()
          };
        }
        this.uploadingFiles = false;
      },
      error: (err) => {
        console.error('Error uploading file', err);
        // Remover el preview si falla la subida
        this.attachments = this.attachments.filter(a => a._id !== tempId);
        this.uploadingFiles = false;
      }
    });
  }

  removeAttachment(index: number): void {
    this.attachments.splice(index, 1);
  }

  isImageFile(url: string, name: string): boolean {
    // Si no hay URL, verificar por extensión del nombre
    if (!url || url === '') {
      if (name) {
        const ext = name.split('.').pop()?.toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext || '');
      }
      return false;
    }
    
    // Si es una imagen en base64
    if (url.startsWith('data:image')) return true;
    
    // Verificar por extensión en la URL
    if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(url)) {
      return true;
    }
    
    // Verificar por extensión en el nombre como fallback
    if (name) {
      const ext = name.split('.').pop()?.toLowerCase();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext || '');
    }
    
    return false;
  }

  getFileIcon(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase();
    const iconMap: { [key: string]: string } = {
      'pdf': '📄',
      'doc': '📝',
      'docx': '📝',
      'xls': '📊',
      'xlsx': '📊',
      'zip': '📦',
      'rar': '📦',
      'txt': '📄',
      'csv': '📊'
    };
    return iconMap[ext || ''] || '📎';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  handleImageError(event: Event, attachment: Attachment): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    // El div de fallback ya está en el HTML, solo necesitamos ocultar la imagen
  }

  downloadAttachment(attachment: Attachment): void {
    if (!attachment.url) return;
    
    // Si es una imagen en base64, descargar directamente
    if (attachment.url.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = attachment.url;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    
    // Para archivos del servidor, usar fetch para evitar problemas de CORS
    fetch(attachment.url)
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch(error => {
        console.error('Error downloading file', error);
        // Fallback: abrir en nueva pestaña
        window.open(attachment.url, '_blank');
      });
  }

  deleteTask(): void {
    if (!this.selectedTask) return;

    if (confirm('¿Estás seguro de eliminar esta tarea?')) {
      this.http.delete(`${this.apiUrl}/tasks/${this.selectedTask._id}`).subscribe({
        next: () => {
          this.loadTasks();
          this.closeTaskModal();
        },
        error: (err) => console.error('Error deleting task', err)
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/board']);
  }

  addComment(): void {
    if (!this.selectedTask) return;

    const editor = document.querySelector('.comment-editor') as HTMLElement;
    if (!editor) return;

    // Obtener el texto del editor
    const text = editor.innerText || editor.textContent || '';
    const html = editor.innerHTML || '';
    
    // Verificar que haya contenido
    if (!text.trim() && !html.replace(/<[^>]*>/g, '').trim()) {
      return;
    }

    const currentUser = this.authService.currentUser;
    if (!currentUser) {
      console.error('No user logged in');
      return;
    }

    // Usar HTML si está disponible, sino usar texto plano
    const commentText = html.trim() || text.trim();

    const commentData = {
      text: commentText
    };

    this.http.post(`${this.apiUrl}/tasks/${this.selectedTask._id}/comments`, commentData).subscribe({
      next: (response: any) => {
        // Limpiar el editor primero
        this.newCommentText = '';
        if (editor) {
          editor.innerHTML = '';
        }
        
        // Recargar la tarea completa para obtener los comentarios actualizados con el usuario populado
        if (!this.selectedTask) return;
        this.http.get<Task>(`${this.apiUrl}/tasks/${this.selectedTask._id}`).subscribe({
          next: (updatedTask) => {
            // Actualizar la tarea seleccionada
            this.selectedTask = updatedTask;
            // Actualizar los comentarios
            this.comments = (updatedTask.comments || []).map(comment => ({
              ...comment,
              userId: typeof comment.userId === 'object' ? comment.userId : this.users.find(u => u._id === comment.userId) || comment.userId
            }));
            // Recargar todas las tareas del tablero
            this.loadTasks();
          },
          error: (err) => {
            console.error('Error reloading task', err);
            // Si falla, intentar agregar el comentario manualmente
            const newComment: Comment = {
              _id: response._id,
              userId: response.userId || {
                _id: currentUser.id,
                firstName: currentUser.firstName,
                lastName: currentUser.lastName,
                email: currentUser.email
              } as User,
              text: response.text,
              createdAt: response.createdAt || new Date().toISOString()
            };
            this.comments.push(newComment);
          }
        });
      },
      error: (err) => {
        console.error('Error adding comment', err);
        alert('Error al agregar el comentario. Por favor, intenta de nuevo.');
      }
    });
  }

  onCommentChange(event: Event): void {
    const target = event.target as HTMLElement;
    const text = target.innerText || target.textContent || '';
    this.newCommentText = target.innerHTML || '';
    // Actualizar también el innerHTML si solo hay texto plano
    if (text.trim() && !target.innerHTML.trim()) {
      this.newCommentText = text;
    }
  }

  formatCommentText(command: string, event?: Event, value?: string): void {
    if (event) {
      event.preventDefault();
    }
    const editor = document.querySelector('.comment-editor') as HTMLElement;
    if (editor) {
      editor.focus();
      if (value) {
        document.execCommand(command, false, value);
      } else {
        document.execCommand(command, false);
      }
      this.newCommentText = editor.innerHTML;
    }
  }

  formatCommentHeading(tag: string, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    const editor = document.querySelector('.comment-editor') as HTMLElement;
    if (editor) {
      editor.focus();
      document.execCommand('formatBlock', false, tag);
      this.newCommentText = editor.innerHTML;
    }
  }

  insertCommentLink(event: Event): void {
    event.preventDefault();
    const url = prompt('Introduce la URL:');
    if (url) {
      const editor = document.querySelector('.comment-editor') as HTMLElement;
      if (editor) {
        editor.focus();
        document.execCommand('createLink', false, url);
        this.newCommentText = editor.innerHTML;
      }
    }
  }

  setCommentTextColor(event: Event): void {
    const input = event.target as HTMLInputElement;
    const color = input.value;
    const editor = document.querySelector('.comment-editor') as HTMLElement;
    if (editor) {
      editor.focus();
      document.execCommand('foreColor', false, color);
      this.newCommentText = editor.innerHTML;
    }
  }

  removeCommentFormat(event: Event): void {
    if (event) {
      event.preventDefault();
    }
    const editor = document.querySelector('.comment-editor') as HTMLElement;
    if (editor) {
      editor.focus();
      document.execCommand('removeFormat', false);
      this.newCommentText = editor.innerHTML;
    }
  }

  getUserName(user: User | string): string {
    if (typeof user === 'object' && user) {
      return `${user.firstName} ${user.lastName}`;
    }
    return 'Usuario desconocido';
  }

  getUserInitials(user: User | string): string {
    if (typeof user === 'object' && user) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    return '??';
  }

  formatCommentDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}

