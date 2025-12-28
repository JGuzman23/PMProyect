import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';
import { TaskModalComponent } from '../task-modal/task-modal.component';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { TranslationService } from '../../../../core/services/translation.service';

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
  title?: string;
  size: number;
  uploadedAt?: string;
  statusId?: string;
  statusName?: string;
  _id?: string;
}

interface Comment {
  _id?: string;
  userId: User | string;
  text: string;
  createdAt?: string;
}

interface ActivityLog {
  _id?: string;
  type: 'created' | 'status_changed' | 'priority_changed' | 'assignees_changed' | 'client_changed' | 'due_date_changed' | 'title_changed' | 'description_changed' | 'comment_added' | 'attachment_added' | 'attachment_removed';
  userId: User | string;
  oldValue?: any;
  newValue?: any;
  description?: string;
  createdAt?: string;
}

interface ActivityItem {
  type: 'comment' | 'activity';
  data: Comment | ActivityLog;
  timestamp: Date;
}

interface Label {
  _id: string;
  name: string;
  color: string;
}

interface Task {
  _id: string;
  taskId?: string;
  title: string;
  description: string;
  assignees: User[];
  priority: string;
  dueDate?: string;
  order: number;
  columnId?: string | { _id: string; name?: string };
  attachments?: Attachment[];
  comments?: Comment[];
  activityLog?: ActivityLog[];
  labels?: Label[];
  clientId?: string | Client;
  agentIds?: string[];
  agentNames?: string[];
  boardId?: string | { _id: string; name?: string };
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
  imports: [CommonModule, DragDropModule, FormsModule, TaskModalComponent, TranslatePipe],
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
  showAgentDropdown = false;
  showClientDropdown = false;
  showPriorityDropdown = false;
  showTaskActionsDropdown = false;
  clientSearchTerm = '';
  agentSearchTerm = '';
  assigneeSearchTerm = '';
  prioritySearchTerm = '';
  filteredClients: Client[] = [];
  filteredAgents: Agent[] = [];
  filteredUsers: User[] = [];
  filteredPriorities: { value: string; label: string }[] = [];
  
  // Filter properties
  showFilterClientDropdown = false;
  showFilterAssigneeDropdown = false;
  showFilterStatusDropdown = false;
  showFilterPriorityDropdown = false;
  filterClientSearchTerm = '';
  filterAssigneeSearchTerm = '';
  selectedFilterClients: string[] = [];
  selectedFilterAssignees: string[] = [];
  selectedFilterStatuses: string[] = [];
  selectedFilterPriorities: string[] = [];
  allTasks: Task[] = []; // Store all tasks before filtering
  filteredColumns: Column[] = []; // Store filtered columns
  showAttachmentTitleModal = false;
  pendingFile: File | null = null;
  attachmentTitle = '';
  isEditMode = false;
  taskForm = {
    title: '',
    description: '',
    priority: 'medium',
    assignees: [] as string[],
    dueDate: '',
    clientId: '',
    agentIds: [] as string[],
    agentNames: [] as string[]
  };
  attachments: Attachment[] = [];
  attachmentsByStatus: { [statusId: string]: Attachment[] } = {};
  uploadingFiles = false;
  pendingStatusId: string | null = null;
  comments: Comment[] = [];
  activityLog: ActivityLog[] = [];
  activityItems: ActivityItem[] = [];
  newCommentText: string = '';
  selectedClient: Client | null = null;

  private apiUrl = environment.apiUrl;
  boardId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.boardId = this.route.snapshot.paramMap.get('id') || '';
    this.loadBoard();
    this.loadUsers();
    this.loadClients();
    // Inicializar listas filtradas
    this.updateFilteredPriorities();
    
    // Suscribirse a cambios en los query params para abrir el modal cuando se navega desde el buscador
    this.route.queryParams.subscribe(params => {
      if (params['taskId']) {
        console.log('Query param taskId detected:', params['taskId'], 'Loading:', this.loading);
        // Si ya se cargaron las tareas, abrir el modal inmediatamente
        if (!this.loading && this.columns.length > 0) {
          console.log('Tasks already loaded, opening modal immediately');
          this.checkAndOpenTaskModal(params['taskId']);
        } else {
          console.log('Waiting for tasks to load...');
          // Si aún se están cargando, esperar a que terminen usando un intervalo
          const checkInterval = setInterval(() => {
            if (!this.loading && this.columns.length > 0) {
              console.log('Tasks loaded, opening modal');
              clearInterval(checkInterval);
              this.checkAndOpenTaskModal(params['taskId']);
            }
          }, 100);
          // Timeout de seguridad después de 5 segundos
          setTimeout(() => {
            clearInterval(checkInterval);
            if (params['taskId']) {
              console.log('Timeout reached, attempting to open modal');
              this.checkAndOpenTaskModal(params['taskId']);
            }
          }, 5000);
        }
      }
    });
  }

  checkAndOpenTaskModal(taskId?: string): void {
    // Verificar si hay un taskId en los query params para abrir el modal
    const targetTaskId = taskId || this.route.snapshot.queryParams['taskId'];
    console.log('checkAndOpenTaskModal called with taskId:', targetTaskId);
    
    if (targetTaskId) {
      // Buscar la tarea en las columnas cargadas
      const allTasks = this.columns.flatMap(col => col.tasks);
      console.log('Total tasks in columns:', allTasks.length);
      const task = allTasks.find(t => t._id === targetTaskId);
      
      if (task) {
        console.log('Task found in columns, opening modal');
        // Usar openTaskModal para inicializar correctamente el modal
        this.openTaskModal(task);
        // Limpiar el query param después de abrir el modal
        setTimeout(() => {
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {},
            replaceUrl: true
          });
        }, 100);
      } else {
        console.log('Task not found in columns, loading from API');
        // Si no se encuentra la tarea, intentar cargarla directamente desde el API
        this.http.get<Task>(`${this.apiUrl}/tasks/${targetTaskId}`).subscribe({
          next: (task) => {
            console.log('Task loaded from API, opening modal');
            this.openTaskModal(task);
            // Limpiar el query param después de abrir el modal
            setTimeout(() => {
              this.router.navigate([], {
                relativeTo: this.route,
                queryParams: {},
                replaceUrl: true
              });
            }, 100);
          },
          error: (err) => {
            console.error('Error loading task', err);
          }
        });
      }
    }
  }

  loadUsers(): void {
    this.loadingUsers = true;
    this.http.get<User[]>(`${this.apiUrl}/users`).subscribe({
      next: (users) => {
        this.users = users;
        this.updateFilteredUsers();
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
        this.updateFilteredClients();
        // Actualizar también los filtros de búsqueda
        this.filteredClients = this.clients;
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
      // Si cambia el cliente, limpiar agentes seleccionados
      this.taskForm.agentIds = [];
      this.taskForm.agentNames = [];
      this.agentSearchTerm = '';
      this.updateFilteredAgents();
    } else {
      this.selectedClient = null;
      this.taskForm.agentIds = [];
      this.taskForm.agentNames = [];
      this.agentSearchTerm = '';
      this.filteredAgents = [];
    }
  }

  onAgentToggle(agentIndex: number): void {
    if (!this.selectedClient || this.selectedClient.type !== 'empresa') return;
    
    const agent = this.selectedClient.agents?.[agentIndex];
    if (!agent) return;

    const index = this.taskForm.agentIds.indexOf(agentIndex.toString());
    
    if (index > -1) {
      // Remover agente
      this.taskForm.agentIds.splice(index, 1);
      this.taskForm.agentNames.splice(index, 1);
    } else {
      // Agregar agente
      this.taskForm.agentIds.push(agentIndex.toString());
      this.taskForm.agentNames.push(agent.name);
    }
  }

  loadBoard(): void {
    this.loading = true;
    if (!this.boardId) {
      console.error('No board ID provided');
      this.loading = false;
      return;
    }
    this.http.get<Board>(`${this.apiUrl}/boards/${this.boardId}`).subscribe({
      next: (board) => {
        console.log('Board loaded:', board);
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
      console.log('No project ID, using board columns:', this.board!.columns);
      this.columns = this.board!.columns.map(col => ({ ...col, tasks: [] }));
      this.loadTasks();
      return;
    }

    // Cargar estados del proyecto
    this.http.get<any[]>(`${this.apiUrl}/admin/statuses?projectId=${this.board.projectId._id}`).subscribe({
      next: (statuses) => {
        console.log('Statuses loaded:', statuses);
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
          console.log('No statuses, using board columns:', this.board!.columns);
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
        console.log('Tasks loaded:', tasks);
        console.log('Columns before assignment:', this.columns);
        // Normalizar URLs de attachments y migrar campos antiguos de agentes
        tasks = tasks.map(task => {
          // Migración: si tiene agentId/agentName antiguos, convertir a arrays
          if (!task.agentIds && (task as any).agentId) {
            task.agentIds = [(task as any).agentId];
          }
          if (!task.agentNames && (task as any).agentName) {
            task.agentNames = [(task as any).agentName];
          }
          
          return {
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
          };
        });
        // Guardar todas las tareas antes de filtrar
        this.allTasks = [...tasks];
        
        // Asignar tareas a las columnas basándose en columnId
        this.columns = this.columns.map(col => {
          const columnTasks = tasks.filter(t => {
            if (!t.columnId) return false;
            // Buscar por _id o por name
            const taskColumnId = typeof t.columnId === 'object' ? t.columnId._id : t.columnId;
            return taskColumnId === col._id || taskColumnId === col.name;
          }).sort((a, b) => (a.order || 0) - (b.order || 0));
          console.log(`Column ${col.name} (${col._id}): ${columnTasks.length} tasks`);
          return {
            ...col,
            tasks: columnTasks
          };
        });
        console.log('Columns after assignment:', this.columns);
        
        // Aplicar filtros si hay alguno activo
        if (this.hasActiveFilters()) {
          this.applyFilters();
        }
        
        this.loading = false;
        
        // Verificar si hay un taskId en los query params para abrir el modal después de cargar las tareas
        this.checkAndOpenTaskModal();
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
        agentIds: task.agentIds ? [...task.agentIds] : [],
        agentNames: task.agentNames ? [...task.agentNames] : []
      };
      if (clientId) {
        this.selectedClient = this.clients.find(c => c._id === clientId) || null;
      } else {
        this.selectedClient = null;
      }
      // Normalizar URLs de attachments y agrupar por estado
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
      this.groupAttachmentsByStatus();
      // Cargar comentarios
      this.comments = (task.comments || []).map(comment => ({
        ...comment,
        userId: typeof comment.userId === 'object' ? comment.userId : this.users.find(u => u._id === comment.userId) || comment.userId
      }));

      // Cargar historial de actividades
      this.activityLog = (task.activityLog || []).map(activity => ({
        ...activity,
        userId: typeof activity.userId === 'object' ? activity.userId : this.users.find(u => u._id === activity.userId) || activity.userId
      }));

      // Combinar comentarios y actividades ordenados por fecha
      this.combineActivitiesAndComments();
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
        agentIds: [],
        agentNames: []
      };
      this.selectedClient = null;
      this.attachments = [];
      this.attachmentsByStatus = {};
      this.comments = [];
      this.activityLog = [];
      this.activityItems = [];
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
      // Inicializar el editor de comentarios
      const commentEditor = document.querySelector('.comment-editor') as HTMLElement;
      if (commentEditor && !commentEditor.innerHTML && !this.newCommentText) {
        commentEditor.innerHTML = '';
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
        agentIds: this.selectedTask.agentIds ? [...this.selectedTask.agentIds] : [],
        agentNames: this.selectedTask.agentNames ? [...this.selectedTask.agentNames] : []
      };
      if (clientId) {
        this.selectedClient = this.clients.find(c => c._id === clientId) || null;
      } else {
        this.selectedClient = null;
      }
      this.attachments = this.selectedTask.attachments || [];
      this.groupAttachmentsByStatus();
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
  }

  onTaskModalSave(taskFormData: any): void {
    // Actualizar taskForm con los datos del componente hijo
    this.taskForm = { ...taskFormData };
    
    // Actualizar selectedClient si hay clientId
    if (this.taskForm.clientId) {
      this.selectedClient = this.clients.find(c => c._id === this.taskForm.clientId) || null;
    } else {
      this.selectedClient = null;
    }
    
    // Los archivos adjuntos se manejan directamente en el componente task-modal,
    // así que no necesitamos incluirlos aquí. Llamar al método saveTask existente.
    this.saveTask();
  }

  onTaskModalDelete(taskId: string): void {
    // Llamar al método deleteTask existente
    this.deleteTask();
  }

  onTaskUpdated(updatedTask: Task): void {
    // Actualizar la tarea en el board
    this.selectedTask = updatedTask;
    
    // Actualizar la tarea en la columna correspondiente
    const column = this.columns.find(col => 
      col.tasks.some(t => t._id === updatedTask._id)
    );
    
    if (column) {
      const taskIndex = column.tasks.findIndex(t => t._id === updatedTask._id);
      if (taskIndex !== -1) {
        column.tasks[taskIndex] = updatedTask;
      }
    }
    
    // Recargar el board para obtener los datos actualizados
    this.loadBoard();
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

  updateFilteredClients(): void {
    // Usar el término de búsqueda del filtro si está disponible, sino el del formulario
    const searchTerm = this.filterClientSearchTerm || this.clientSearchTerm;
    if (!searchTerm.trim()) {
      this.filteredClients = this.clients;
      return;
    }
    const search = searchTerm.toLowerCase();
    this.filteredClients = this.clients.filter(client => {
      const name = client.name.toLowerCase();
      const lastName = client.lastName?.toLowerCase() || '';
      return name.includes(search) || lastName.includes(search);
    });
  }

  updateFilteredAgents(): void {
    if (!this.selectedClient?.agents) {
      this.filteredAgents = [];
      return;
    }
    if (!this.agentSearchTerm.trim()) {
      this.filteredAgents = this.selectedClient.agents;
      return;
    }
    const search = this.agentSearchTerm.toLowerCase();
    this.filteredAgents = this.selectedClient.agents.filter(agent => {
      const name = agent.name.toLowerCase();
      const email = agent.email?.toLowerCase() || '';
      const phone = agent.phone?.toLowerCase() || '';
      return name.includes(search) || email.includes(search) || phone.includes(search);
    });
  }

  getAgentIndex(agent: Agent): number {
    if (!this.selectedClient?.agents) return -1;
    return this.selectedClient.agents.findIndex(a => a.name === agent.name && a.email === agent.email);
  }

  updateFilteredUsers(): void {
    // Usar el término de búsqueda del filtro si está disponible, sino el del formulario
    const searchTerm = this.filterAssigneeSearchTerm || this.assigneeSearchTerm;
    if (!searchTerm.trim()) {
      this.filteredUsers = this.users;
      return;
    }
    const search = searchTerm.toLowerCase();
    this.filteredUsers = this.users.filter(user => {
      const firstName = user.firstName.toLowerCase();
      const lastName = user.lastName.toLowerCase();
      const email = user.email.toLowerCase();
      return firstName.includes(search) || lastName.includes(search) || email.includes(search);
    });
  }

  updateFilteredPriorities(): void {
    const priorities = [
      { value: 'low', label: 'Baja' },
      { value: 'medium', label: 'Media' },
      { value: 'high', label: 'Alta' },
      { value: 'urgent', label: 'Urgente' }
    ];
    if (!this.prioritySearchTerm.trim()) {
      this.filteredPriorities = priorities;
      return;
    }
    const search = this.prioritySearchTerm.toLowerCase();
    this.filteredPriorities = priorities.filter(p => p.label.toLowerCase().includes(search));
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
    if (!this.selectedTask?.clientId || !this.selectedTask?.agentNames || this.selectedTask.agentNames.length === 0) {
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
    if (task.agentNames && task.agentNames.length > 0) {
      return task.agentNames.join(', ');
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
      this.assigneeSearchTerm = '';
    }
    if (!target.closest('.agent-dropdown-container')) {
      this.showAgentDropdown = false;
      this.agentSearchTerm = '';
    }
    if (!target.closest('.client-dropdown-container')) {
      this.showClientDropdown = false;
      this.clientSearchTerm = '';
    }
    if (!target.closest('.priority-dropdown-container')) {
      this.showPriorityDropdown = false;
      this.prioritySearchTerm = '';
    }
    // Close filter dropdowns
    if (!target.closest('.filter-client-dropdown')) {
      this.showFilterClientDropdown = false;
      this.filterClientSearchTerm = '';
    }
    if (!target.closest('.filter-assignee-dropdown')) {
      this.showFilterAssigneeDropdown = false;
      this.filterAssigneeSearchTerm = '';
    }
    if (!target.closest('.filter-status-dropdown')) {
      this.showFilterStatusDropdown = false;
    }
    if (!target.closest('.filter-priority-dropdown')) {
      this.showFilterPriorityDropdown = false;
    }
    if (!target.closest('.priority-dropdown-container')) {
      this.showPriorityDropdown = false;
      this.prioritySearchTerm = '';
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  saveTask(): void {
    // Validación: si es empresa, debe tener al menos un agente seleccionado
    if (this.taskForm.clientId && this.selectedClient?.type === 'empresa') {
      if (this.taskForm.agentIds.length === 0) {
        alert('Debe seleccionar al menos un agente para clientes tipo empresa');
        return;
      }
    }

    const taskData: any = {};

    // Solo enviar los campos que realmente cambiaron o son necesarios para nueva tarea
    if (this.selectedTask) {
      // Para tareas existentes, solo enviar lo que cambió
      const oldTask = this.selectedTask;
      
      // Título
      if (this.taskForm.title !== oldTask.title) {
        taskData.title = this.taskForm.title;
      }
      
      // Descripción
      if (this.taskForm.description !== (oldTask.description || '')) {
        taskData.description = this.taskForm.description;
      }
      
      // Prioridad
      if (this.taskForm.priority !== oldTask.priority) {
        taskData.priority = this.taskForm.priority;
      }
      
      // Asignados - comparar arrays
      const oldAssignees = (oldTask.assignees || []).map(a => typeof a === 'object' ? a._id : a).sort();
      const newAssignees = (this.taskForm.assignees || []).sort();
      if (JSON.stringify(oldAssignees) !== JSON.stringify(newAssignees)) {
        taskData.assignees = this.taskForm.assignees;
      }
      
      // Fecha de fin
      const oldDueDate = oldTask.dueDate ? new Date(oldTask.dueDate).toISOString().split('T')[0] : '';
      const newDueDate = this.taskForm.dueDate || '';
      if (oldDueDate !== newDueDate) {
        taskData.dueDate = this.taskForm.dueDate || undefined;
      }
      
      // Cliente
      const oldClientId = typeof oldTask.clientId === 'object' ? oldTask.clientId._id : oldTask.clientId || '';
      if (this.taskForm.clientId !== oldClientId) {
        taskData.clientId = this.taskForm.clientId || undefined;
      }
      
      // Agentes (solo si el cliente es empresa)
      if (this.selectedClient?.type === 'empresa') {
        const oldAgentIds = (oldTask.agentIds || []).sort();
        const newAgentIds = (this.taskForm.agentIds || []).sort();
        if (JSON.stringify(oldAgentIds) !== JSON.stringify(newAgentIds)) {
          taskData.agentIds = this.taskForm.agentIds;
          taskData.agentNames = this.taskForm.agentNames;
        }
      }
      
      // Adjuntos - se manejan directamente en el componente task-modal
      // No incluirlos aquí para evitar sobrescribir los adjuntos existentes
      
      // NO enviar columnId a menos que se esté moviendo la tarea (eso se hace con drag & drop)
      // El columnId solo debe cambiar cuando se arrastra la tarea, no cuando se edita
    } else {
      // Para nueva tarea, enviar todos los campos necesarios
      const columnId = this.columns[this.selectedColumnIndex]._id || this.columns[this.selectedColumnIndex].name;
      taskData.title = this.taskForm.title;
      taskData.description = this.taskForm.description;
      taskData.priority = this.taskForm.priority;
      taskData.assignees = this.taskForm.assignees;
      taskData.dueDate = this.taskForm.dueDate || undefined;
      // Adjuntos - se manejan directamente en el componente task-modal
      taskData.boardId = this.boardId;
      taskData.projectId = this.board!.projectId._id;
      taskData.columnId = columnId;
      
      // Agregar cliente si está seleccionado
      if (this.taskForm.clientId) {
        taskData.clientId = this.taskForm.clientId;
        
        // Si es empresa y hay agentes seleccionados, agregar agentes
        if (this.selectedClient?.type === 'empresa' && this.taskForm.agentIds.length > 0) {
          taskData.agentIds = this.taskForm.agentIds;
          taskData.agentNames = this.taskForm.agentNames;
        }
      }
    }

    if (this.selectedTask) {
      this.http.put<Task>(`${this.apiUrl}/tasks/${this.selectedTask._id}`, taskData).subscribe({
        next: (updatedTask) => {
          // Actualizar la tarea seleccionada con el historial
          this.selectedTask = updatedTask;
          // Actualizar comentarios y actividades
          this.comments = (updatedTask.comments || []).map(comment => ({
            ...comment,
            userId: typeof comment.userId === 'object' ? comment.userId : this.users.find(u => u._id === comment.userId) || comment.userId
          }));
          this.activityLog = (updatedTask.activityLog || []).map(activity => ({
            ...activity,
            userId: typeof activity.userId === 'object' ? activity.userId : this.users.find(u => u._id === activity.userId) || activity.userId
          }));
          this.combineActivitiesAndComments();
          this.loadTasks();
          this.isEditMode = false; // Volver a modo vista después de guardar
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

  triggerFileInput(statusId: string): void {
    const inputId = `fileInput-${statusId}`;
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  triggerFileInputEdit(statusId: string): void {
    const inputId = `fileInputEdit-${statusId}`;
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  onFileSelected(event: Event, statusId?: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      // Si estamos en modo vista, activar modo edición para poder subir archivos
      if (!this.isEditMode && this.selectedTask) {
        this.enableEditMode();
      }
      // Procesar archivos uno por uno para pedir título y estado
      const files = Array.from(input.files);
      if (files.length > 0) {
        this.pendingFile = files[0];
        this.pendingStatusId = statusId || null;
        this.attachmentTitle = '';
        this.showAttachmentTitleModal = true;
      }
      // Limpiar el input para permitir subir el mismo archivo de nuevo
      input.value = '';
    }
  }

  confirmAttachmentUpload(): void {
    if (this.pendingFile && this.attachmentTitle.trim() && this.pendingStatusId) {
      const status = this.columns.find(c => c._id === this.pendingStatusId);
      this.uploadFile(this.pendingFile, this.attachmentTitle.trim(), this.pendingStatusId, status?.name || '');
      this.cancelAttachmentUpload();
    } else if (this.pendingFile && !this.pendingStatusId) {
      alert('Debe seleccionar un estado para el adjunto');
    } else if (this.pendingFile) {
      alert('Debe ingresar un título para el adjunto');
    }
  }

  cancelAttachmentUpload(): void {
    this.showAttachmentTitleModal = false;
    this.pendingFile = null;
    this.pendingStatusId = null;
    this.attachmentTitle = '';
  }

  uploadFile(file: File, title: string, statusId: string, statusName: string): void {
    this.uploadingFiles = true;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('statusId', statusId);
    formData.append('statusName', statusName);

    // Crear preview local mientras se sube
    const reader = new FileReader();
    const tempId = Date.now().toString();
    
    reader.onload = (e: any) => {
      const previewAttachment: Attachment = {
        url: e.target.result,
        name: file.name,
        title: title,
        size: file.size,
        statusId: statusId,
        statusName: statusName,
        uploadedAt: new Date().toISOString(),
        _id: tempId
      };
      this.attachments.push(previewAttachment);
      this.groupAttachmentsByStatus();
    };
    
    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else {
      // Para archivos no imagen, usar un placeholder
      const previewAttachment: Attachment = {
        url: '',
        name: file.name,
        title: title,
        size: file.size,
        statusId: statusId,
        statusName: statusName,
        uploadedAt: new Date().toISOString(),
        _id: tempId
      };
      this.attachments.push(previewAttachment);
      this.groupAttachmentsByStatus();
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
            title: response.title || title,
            size: response.size || file.size,
            statusId: response.statusId || statusId,
            statusName: response.statusName || statusName,
            uploadedAt: response.uploadedAt || new Date().toISOString()
          };
          this.groupAttachmentsByStatus();
        }
        this.uploadingFiles = false;
      },
      error: (err) => {
        console.error('Error uploading file', err);
        // Remover el preview si falla la subida
        this.attachments = this.attachments.filter(a => a._id !== tempId);
        this.uploadingFiles = false;
        alert('Error al subir el archivo. Por favor, intente nuevamente.');
      }
    });
  }

  removeAttachment(statusId: string, index: number): void {
    const statusAttachments = this.attachmentsByStatus[statusId] || [];
    const attachment = statusAttachments[index];
    if (attachment) {
      const globalIndex = this.attachments.findIndex(a => a._id === attachment._id);
      if (globalIndex !== -1) {
        this.attachments.splice(globalIndex, 1);
        this.groupAttachmentsByStatus();
      }
    }
  }

  groupAttachmentsByStatus(): void {
    this.attachmentsByStatus = {};
    this.attachments.forEach(att => {
      const statusId = att.statusId || 'no-status';
      if (!this.attachmentsByStatus[statusId]) {
        this.attachmentsByStatus[statusId] = [];
      }
      this.attachmentsByStatus[statusId].push(att);
    });
  }

  getAttachmentsForStatus(statusId: string): Attachment[] {
    return this.attachmentsByStatus[statusId] || [];
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

            // Actualizar historial de actividades
            this.activityLog = (updatedTask.activityLog || []).map(activity => ({
              ...activity,
              userId: typeof activity.userId === 'object' ? activity.userId : this.users.find(u => u._id === activity.userId) || activity.userId
            }));

            // Combinar comentarios y actividades ordenados por fecha
            this.combineActivitiesAndComments();
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
    // Solo actualizar la variable, no forzar actualización del DOM
    this.newCommentText = target.innerHTML || '';
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

  getCommentUserId(item: ActivityItem): User | string {
    if (item.type === 'comment') {
      return (item.data as Comment).userId;
    }
    return 'Usuario desconocido';
  }

  getActivityUserId(item: ActivityItem): User | string {
    if (item.type === 'activity') {
      return (item.data as ActivityLog).userId;
    }
    return 'Usuario desconocido';
  }

  getCommentText(item: ActivityItem): string {
    if (item.type === 'comment') {
      return (item.data as Comment).text;
    }
    return '';
  }

  getCommentCreatedAt(item: ActivityItem): string {
    if (item.type === 'comment') {
      return (item.data as Comment).createdAt || '';
    }
    return '';
  }

  getActivityCreatedAt(item: ActivityItem): string {
    if (item.type === 'activity') {
      return (item.data as ActivityLog).createdAt || '';
    }
    return '';
  }

  combineActivitiesAndComments(): void {
    const items: ActivityItem[] = [];

    // Agregar comentarios
    this.comments.forEach(comment => {
      items.push({
        type: 'comment',
        data: comment,
        timestamp: comment.createdAt ? new Date(comment.createdAt) : new Date()
      });
    });

    // Agregar actividades
    this.activityLog.forEach(activity => {
      items.push({
        type: 'activity',
        data: activity,
        timestamp: activity.createdAt ? new Date(activity.createdAt) : new Date()
      });
    });

    // Ordenar por fecha (más antiguo primero, más reciente debajo)
    this.activityItems = items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  getActivityDescription(item: ActivityItem): string {
    if (item.type !== 'activity') return '';
    const activity = item.data as ActivityLog;
    if (activity && activity.description) {
      return activity.description;
    }

    if (!activity) return '';
    switch (activity.type) {
      case 'created':
        return 'Tarea creada';
      case 'status_changed':
        return `Estado cambiado`;
      case 'priority_changed':
        const priorityMap: { [key: string]: string } = {
          'low': 'Baja',
          'medium': 'Media',
          'high': 'Alta',
          'urgent': 'Urgente'
        };
        const oldPriority = priorityMap[activity.oldValue] || activity.oldValue;
        const newPriority = priorityMap[activity.newValue] || activity.newValue;
        return `Prioridad cambiada de ${oldPriority} a ${newPriority}`;
      case 'assignees_changed':
        return 'Asignados modificados';
      case 'client_changed':
        return 'Cliente modificado';
      case 'due_date_changed':
        return 'Fecha de fin modificada';
      case 'title_changed':
        return `Título cambiado de "${activity.oldValue}" a "${activity.newValue}"`;
      case 'description_changed':
        return 'Descripción modificada';
      case 'comment_added':
        return 'Comentario agregado';
      case 'attachment_added':
        return 'Archivo adjunto agregado';
      case 'attachment_removed':
        return 'Archivo adjunto eliminado';
      default:
        return 'Cambio realizado';
    }
  }

  getActivityIconPath(item: ActivityItem): string {
    if (item.type !== 'activity') return '';
    const activity = item.data as ActivityLog;
    switch (activity.type) {
      case 'created':
        return 'M12 4v16m8-8H4';
      case 'status_changed':
        return 'M8 7l4-4 4 4m0 6l-4 4-4-4';
      case 'priority_changed':
        return 'M5 10l7-7m0 0l7 7m-7-7v18';
      case 'assignees_changed':
        return 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z';
      case 'client_changed':
        return 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z';
      case 'due_date_changed':
        return 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z';
      case 'title_changed':
        return 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z';
      case 'description_changed':
        return 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z';
      case 'comment_added':
        return 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z';
      case 'attachment_added':
        return 'M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13';
      case 'attachment_removed':
        return 'M6 18L18 6M6 6l12 12';
      default:
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
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

  // Filter methods
  applyFilters(): void {
    if (this.allTasks.length === 0) {
      // Si aún no se han cargado todas las tareas, no aplicar filtros
      return;
    }

    // Filtrar todas las tareas según los filtros activos
    let filteredTasks = [...this.allTasks];

    // Filtrar por cliente
    if (this.selectedFilterClients.length > 0) {
      filteredTasks = filteredTasks.filter(task => {
        const taskClientId = typeof task.clientId === 'object' ? task.clientId._id : task.clientId;
        return taskClientId && this.selectedFilterClients.includes(taskClientId);
      });
    }

    // Filtrar por usuario asignado
    if (this.selectedFilterAssignees.length > 0) {
      filteredTasks = filteredTasks.filter(task => {
        return task.assignees && task.assignees.some(assignee => {
          const assigneeId = typeof assignee === 'object' ? assignee._id : assignee;
          return this.selectedFilterAssignees.includes(assigneeId);
        });
      });
    }

    // Filtrar por estado
    if (this.selectedFilterStatuses.length > 0) {
      filteredTasks = filteredTasks.filter(task => {
        if (!task.columnId) return false;
        const taskColumnId = typeof task.columnId === 'object' ? task.columnId._id : task.columnId;
        const taskColumnName = typeof task.columnId === 'object' ? task.columnId.name : null;
        return this.selectedFilterStatuses.includes(taskColumnId) || (taskColumnName && this.selectedFilterStatuses.includes(taskColumnName));
      });
    }

    // Filtrar por prioridad
    if (this.selectedFilterPriorities.length > 0) {
      filteredTasks = filteredTasks.filter(task => this.selectedFilterPriorities.includes(task.priority));
    }

    // Asignar tareas filtradas a las columnas
    this.columns = this.columns.map(col => {
      const columnTasks = filteredTasks.filter(t => {
        if (!t.columnId) return false;
        const taskColumnId = typeof t.columnId === 'object' ? t.columnId._id : t.columnId;
        return taskColumnId === col._id || taskColumnId === col.name;
      }).sort((a, b) => (a.order || 0) - (b.order || 0));
      
      return {
        ...col,
        tasks: columnTasks
      };
    });
  }

  hasActiveFilters(): boolean {
    return !!(
      this.selectedFilterClients.length > 0 ||
      this.selectedFilterAssignees.length > 0 ||
      this.selectedFilterStatuses.length > 0 ||
      this.selectedFilterPriorities.length > 0
    );
  }

  clearFilters(): void {
    this.selectedFilterClients = [];
    this.selectedFilterAssignees = [];
    this.selectedFilterStatuses = [];
    this.selectedFilterPriorities = [];
    this.filterClientSearchTerm = '';
    this.filterAssigneeSearchTerm = '';
    
    // Restaurar todas las tareas sin filtros
    if (this.allTasks.length > 0) {
      this.columns = this.columns.map(col => {
        const columnTasks = this.allTasks.filter(t => {
          if (!t.columnId) return false;
          const taskColumnId = typeof t.columnId === 'object' ? t.columnId._id : t.columnId;
          return taskColumnId === col._id || taskColumnId === col.name;
        }).sort((a, b) => (a.order || 0) - (b.order || 0));
        
        return {
          ...col,
          tasks: columnTasks
        };
      });
    }
  }

  toggleFilterClient(clientId: string): void {
    const index = this.selectedFilterClients.indexOf(clientId);
    if (index > -1) {
      this.selectedFilterClients.splice(index, 1);
    } else {
      this.selectedFilterClients.push(clientId);
    }
    this.applyFilters();
  }

  isFilterClientSelected(clientId: string): boolean {
    return this.selectedFilterClients.includes(clientId);
  }

  toggleFilterAssignee(userId: string): void {
    const index = this.selectedFilterAssignees.indexOf(userId);
    if (index > -1) {
      this.selectedFilterAssignees.splice(index, 1);
    } else {
      this.selectedFilterAssignees.push(userId);
    }
    this.applyFilters();
  }

  isFilterAssigneeSelected(userId: string): boolean {
    return this.selectedFilterAssignees.includes(userId);
  }

  toggleFilterStatus(statusId: string): void {
    const index = this.selectedFilterStatuses.indexOf(statusId);
    if (index > -1) {
      this.selectedFilterStatuses.splice(index, 1);
    } else {
      this.selectedFilterStatuses.push(statusId);
    }
    this.applyFilters();
  }

  isFilterStatusSelected(statusId: string): boolean {
    return this.selectedFilterStatuses.includes(statusId);
  }

  toggleFilterPriority(priority: string): void {
    const index = this.selectedFilterPriorities.indexOf(priority);
    if (index > -1) {
      this.selectedFilterPriorities.splice(index, 1);
    } else {
      this.selectedFilterPriorities.push(priority);
    }
    this.applyFilters();
  }

  isFilterPrioritySelected(priority: string): boolean {
    return this.selectedFilterPriorities.includes(priority);
  }

  openFilterClientDropdown(): void {
    this.closeAllFilterDropdowns();
    this.showFilterClientDropdown = !this.showFilterClientDropdown;
  }

  openFilterAssigneeDropdown(): void {
    this.closeAllFilterDropdowns();
    this.showFilterAssigneeDropdown = !this.showFilterAssigneeDropdown;
  }

  openFilterStatusDropdown(): void {
    this.closeAllFilterDropdowns();
    this.showFilterStatusDropdown = !this.showFilterStatusDropdown;
  }

  openFilterPriorityDropdown(): void {
    this.closeAllFilterDropdowns();
    this.showFilterPriorityDropdown = !this.showFilterPriorityDropdown;
  }

  private closeAllFilterDropdowns(): void {
    this.showFilterClientDropdown = false;
    this.showFilterAssigneeDropdown = false;
    this.showFilterStatusDropdown = false;
    this.showFilterPriorityDropdown = false;
  }

  getFilterClientCount(): number {
    return this.selectedFilterClients.length;
  }

  getFilterAssigneeCount(): number {
    return this.selectedFilterAssignees.length;
  }

  getFilterStatusCount(): number {
    return this.selectedFilterStatuses.length;
  }

  getFilterPriorityCount(): number {
    return this.selectedFilterPriorities.length;
  }

  hasFilterClients(): boolean {
    return this.selectedFilterClients.length > 0;
  }

  hasFilterAssignees(): boolean {
    return this.selectedFilterAssignees.length > 0;
  }

  hasFilterStatuses(): boolean {
    return this.selectedFilterStatuses.length > 0;
  }

  hasFilterPriorities(): boolean {
    return this.selectedFilterPriorities.length > 0;
  }

  // Status edit modal properties
  showStatusModal = false;
  selectedStatus: Column | null = null;
  statusForm = {
    name: '',
    color: '#94A3B8',
    order: 0
  };
  statusError = '';

  openStatusEditModal(column: Column): void {
    this.selectedStatus = column;
    this.statusForm = {
      name: column.name,
      color: column.color || '#94A3B8',
      order: column.order || 0
    };
    this.statusError = '';
    this.showStatusModal = true;
  }

  closeStatusModal(): void {
    this.showStatusModal = false;
    this.selectedStatus = null;
    this.statusError = '';
  }

  saveStatus(): void {
    if (!this.statusForm.name) {
      this.statusError = this.translationService.translate('admin.statusNameRequired');
      return;
    }

    if (!this.selectedStatus || !this.selectedStatus._id) {
      this.statusError = this.translationService.translate('admin.cannotIdentifyStatus');
      return;
    }

    if (!this.board?.projectId?._id) {
      this.statusError = this.translationService.translate('admin.cannotIdentifyProject');
      return;
    }

    this.statusError = '';

    const statusData = {
      name: this.statusForm.name,
      color: this.statusForm.color,
      order: this.statusForm.order,
      projectId: this.board.projectId._id
    };

    this.http.put(`${this.apiUrl}/admin/statuses/${this.selectedStatus._id}`, statusData).subscribe({
      next: () => {
        this.loadStatuses(); // Recargar estados para actualizar el board
        this.closeStatusModal();
      },
      error: (err) => {
        console.error('Error updating status', err);
        this.statusError = err.error?.error || err.error?.message || this.translationService.translate('admin.errorUpdatingStatus');
      }
    });
  }
}

