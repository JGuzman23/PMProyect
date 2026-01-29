import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { TaskModalComponent } from '../../../board/components/task-modal/task-modal.component';
import { TranslationService, Language } from '../../../../core/services/translation.service';
import { DateService } from '../../../../core/services/date.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput, EventApi, DateSelectArg, EventClickArg, EventDropArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import enLocale from '@fullcalendar/core/locales/en-gb';
import frLocale from '@fullcalendar/core/locales/fr';
import deLocale from '@fullcalendar/core/locales/de';
import ptLocale from '@fullcalendar/core/locales/pt';
import itLocale from '@fullcalendar/core/locales/it';
import { Subscription } from 'rxjs';

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
  boardId?: string | { _id: string; name?: string };
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
  phone?: string;
  phones?: string[];
  company?: string;
  agents?: any[];
  lastName?: string;
  isActive: boolean;
}

interface Board {
  _id: string;
  name: string;
  description?: string;
  projectId?: string | { _id: string };
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
  dueDate?: string;
  startDate?: string;
  priority: string;
  assignees: User[];
  attachments?: Attachment[];
  columnId?: string;
  boardId?: string | Board;
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
  imports: [CommonModule, DatePipe, TaskModalComponent, TranslatePipe, FullCalendarModule],
  templateUrl: './calendar-view.component.html',
  styleUrls: ['./calendar-view.component.css']
})
export class CalendarViewComponent implements OnInit, OnDestroy {
  @ViewChild('fullcalendar') calendarComponent: any;
  
  private languageSubscription?: Subscription;
  private localeMap: { [key in Language]: any } = {
    'es': esLocale,
    'en': enLocale,
    'fr': frLocale,
    'de': deLocale,
    'pt': ptLocale,
    'it': itLocale
  };
  
  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek'
    },
    editable: true,
    droppable: false,
    selectable: false,
    eventClick: this.handleEventClick.bind(this),
    eventDrop: this.handleEventDrop.bind(this),
    eventResize: this.handleEventResize.bind(this),
    locale: esLocale, // Valor por defecto, se actualizará en ngOnInit
    firstDay: 1,
    height: 'auto',
    events: []
  };
  
  tasks: Task[] = [];
  selectedTask: Task | null = null;
  showTaskModal = false;
  statuses: BoardStatus[] = [];
  columns: Column[] = [];
  filteredColumns: Column[] = []; // Columnas filtradas por boardId de la tarea
  users: User[] = [];
  clients: Client[] = [];
  boards: Board[] = [];
  private apiUrl = environment.apiUrl;
  staticFilesUrl = environment.apiUrl.replace('/api', '');

  constructor(
    private http: HttpClient, 
    public translationService: TranslationService,
    private dateService: DateService
  ) {
  }

  ngOnInit(): void {
    // Inicializar el locale con el idioma actual
    const currentLang = this.translationService.getCurrentLanguageValue();
    this.updateCalendarLocale(currentLang);
    
    this.loadStatuses();
    this.loadUsers();
    this.loadClients();
    this.loadBoards();
    // Cargar tareas después de usuarios para poder normalizar assignees
    this.loadTasks();
    
    // Suscribirse a cambios de idioma
    this.languageSubscription = this.translationService.getCurrentLanguage().subscribe(lang => {
      this.updateCalendarLocale(lang);
    });
  }

  ngOnDestroy(): void {
    if (this.languageSubscription) {
      this.languageSubscription.unsubscribe();
    }
  }

  updateCalendarLocale(lang: Language): void {
    const locale = this.localeMap[lang];
    if (locale && this.calendarComponent?.getApi) {
      const calendarApi = this.calendarComponent.getApi();
      if (calendarApi) {
        calendarApi.setOption('locale', locale);
      }
    }
    // También actualizar las opciones para futuras renderizaciones
    this.calendarOptions = {
      ...this.calendarOptions,
      locale: locale
    };
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

  loadBoards(): void {
    this.http.get<Board[]>(`${this.apiUrl}/boards`).subscribe({
      next: (boards) => {
        this.boards = boards;
        // Actualizar eventos del calendario si ya hay tareas cargadas
        if (this.tasks.length > 0) {
          this.updateCalendarEvents();
        }
      },
      error: (err) => {
        console.error('Error loading boards', err);
      }
    });
  }

  loadTasks(): void {
    this.http.get<Task[]>(`${this.apiUrl}/tasks`).subscribe({
      next: (tasks) => {
        // Normalizar URLs de attachments y convertir assignees de strings a objetos User
        // Incluir tareas que tengan startDate o dueDate
        this.tasks = tasks.filter(t => t.dueDate || t.startDate).map(task => {
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
        this.updateCalendarEvents();
      },
      error: (err) => {
        console.error('Error loading tasks', err);
      }
    });
  }

  getBoardInitial(task: Task): string {
    if (!task.boardId) return '';
  
    let boardId: string;
    if (typeof task.boardId === 'string') {
      boardId = task.boardId;
    } else {
      boardId = task.boardId._id;
    }
    
    const board = this.boards.find(b => b._id === boardId);
    if (!board || !board.name) return '';
    
    // Obtener la primera letra del nombre del board en mayúscula
    return board.name;
  }

  updateCalendarEvents(): void {
    const events: EventInput[] = [];
    
    for (const task of this.tasks) {
      const color = this.getTaskStatusColor(task);
      const boardInitial = this.getBoardInitial(task);
      const title = boardInitial ? `[${boardInitial}] ${task.title}` : task.title;
      
      // Si hay startDate y dueDate, crear un evento de rango
      if (task.startDate && task.dueDate) {
        const startDate = new Date(task.startDate);
        const endDate = new Date(task.dueDate);
        // FullCalendar necesita que endDate sea el día siguiente para mostrar correctamente el rango
        endDate.setDate(endDate.getDate() + 1);
        
        events.push({
          id: task._id,
          title: title,
          start: startDate,
          end: endDate,
          allDay: true,
          backgroundColor: color,
          borderColor: color,
          textColor: '#ffffff',
          extendedProps: {
            task: task
          }
        });
        continue;
      }
      
      // Si solo hay startDate, mostrar solo en esa fecha
      if (task.startDate && !task.dueDate) {
        const startDate = new Date(task.startDate);
        
        events.push({
          id: task._id,
          title: title,
          start: startDate,
          allDay: true,
          backgroundColor: color,
          borderColor: color,
          textColor: '#ffffff',
          extendedProps: {
            task: task
          }
        });
        continue;
      }
      
      // Si solo hay dueDate (comportamiento por defecto)
      if (task.dueDate) {
        const taskDate = new Date(task.dueDate);
        
        events.push({
          id: task._id,
          title: title,
          start: taskDate,
          allDay: true,
          backgroundColor: color,
          borderColor: color,
          textColor: '#ffffff',
          extendedProps: {
            task: task
          }
        });
      }
    }
    
    this.calendarOptions.events = events;
  }

  handleEventClick(clickInfo: EventClickArg): void {
    const task = clickInfo.event.extendedProps['task'] as Task;
    if (task) {
      this.openTaskModal(task);
    }
  }

  handleEventDrop(dropInfo: EventDropArg): void {
    const task = dropInfo.event.extendedProps['task'] as Task;
    if (!task || !task.dueDate) {
      return;
    }

    const newDate = dropInfo.event.start;
    if (!newDate) {
      return;
    }

    // Mantener la hora original si existe
    const originalDate = new Date(task.dueDate);
    newDate.setHours(originalDate.getHours());
    newDate.setMinutes(originalDate.getMinutes());
    newDate.setSeconds(originalDate.getSeconds());

    this.updateTaskDate(task._id, newDate);
  }

  handleEventResize(resizeInfo: any): void {
    const task = resizeInfo.event.extendedProps['task'] as Task;
    if (!task || !task.dueDate) {
      return;
    }

    const newDate = resizeInfo.event.start;
    if (!newDate) {
      return;
    }

    // Mantener la hora original si existe
    const originalDate = new Date(task.dueDate);
    newDate.setHours(originalDate.getHours());
    newDate.setMinutes(originalDate.getMinutes());
    newDate.setSeconds(originalDate.getSeconds());

    this.updateTaskDate(task._id, newDate);
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
    
    // Filtrar las columnas según el boardId de la tarea
    this.filterColumnsByBoard(task.boardId);
    
    this.showTaskModal = true;
  }

  filterColumnsByBoard(boardId?: string | Board): void {
    if (!boardId) {
      // Si no hay boardId, usar todas las columnas
      this.filteredColumns = this.columns;
      return;
    }

    // Obtener el boardId como string
    let targetBoardId: string;
    if (typeof boardId === 'string') {
      targetBoardId = boardId;
    } else if (boardId && typeof boardId === 'object' && '_id' in boardId) {
      targetBoardId = boardId._id;
    } else {
      this.filteredColumns = this.columns;
      return;
    }

    // Si los estados ya tienen boardId, filtrarlos localmente
    // Si no, cargarlos desde el servidor filtrados por boardId
    const statusesWithBoardId = this.statuses.filter(s => s.boardId);
    if (statusesWithBoardId.length > 0) {
      // Filtrar los estados que pertenecen al board de la tarea
      const boardStatuses = this.statuses.filter(status => {
        if (!status.boardId) return false;
        
        let statusBoardId: string;
        if (typeof status.boardId === 'string') {
          statusBoardId = status.boardId;
        } else if (status.boardId && typeof status.boardId === 'object' && '_id' in status.boardId) {
          statusBoardId = status.boardId._id;
        } else {
          return false;
        }
        
        return statusBoardId === targetBoardId;
      });

      // Convertir los estados filtrados a columnas
      this.filteredColumns = boardStatuses.map(status => ({
        _id: status._id,
        name: status.name,
        order: 0,
        color: status.color,
        tasks: []
      })).sort((a, b) => a.order - b.order);
    } else {
      // Si los estados no tienen boardId, cargarlos filtrados desde el servidor
      this.http.get<BoardStatus[]>(`${this.apiUrl}/admin/statuses?boardId=${targetBoardId}`).subscribe({
        next: (statuses) => {
          this.filteredColumns = statuses.map(status => ({
            _id: status._id,
            name: status.name,
            order: 0,
            color: status.color,
            tasks: []
          })).sort((a, b) => a.order - b.order);
        },
        error: (err) => {
          console.error('Error loading statuses for board', err);
          // Fallback: usar todas las columnas
          this.filteredColumns = this.columns;
        }
      });
    }
  }

  closeTaskModal(): void {
    this.showTaskModal = false;
    this.selectedTask = null;
  }

  onTaskModalSave(taskFormData: any): void {
    if (!this.selectedTask) {
      // No hay tarea seleccionada, no hacer nada
      return;
    }

    // Validación: si es empresa, debe tener al menos un agente seleccionado
    const selectedClient = this.clients.find(c => c._id === taskFormData.clientId);
    if (taskFormData.clientId && selectedClient?.type === 'empresa') {
      if (!taskFormData.agentIds || taskFormData.agentIds.length === 0) {
        alert('Debe seleccionar al menos un agente para clientes tipo empresa');
        return;
      }
    }

    const taskData: any = {};
    const oldTask = this.selectedTask;

    // Solo enviar los campos que realmente cambiaron
    // Título
    if (taskFormData.title !== oldTask.title) {
      taskData.title = taskFormData.title;
    }

    // Descripción
    if (taskFormData.description !== (oldTask.description || '')) {
      taskData.description = taskFormData.description;
    }

    // Prioridad
    if (taskFormData.priority !== oldTask.priority) {
      taskData.priority = taskFormData.priority;
    }

    // Asignados - comparar arrays
    const oldAssignees = (oldTask.assignees || []).map(a => typeof a === 'object' ? a._id : a).sort();
    const newAssignees = (taskFormData.assignees || []).sort();
    if (JSON.stringify(oldAssignees) !== JSON.stringify(newAssignees)) {
      taskData.assignees = taskFormData.assignees;
    }

    // Fecha de inicio
    const oldStartDate = this.dateService.formatDateForInput(oldTask.startDate);
    const newStartDate = taskFormData.startDate || '';
    if (oldStartDate !== newStartDate) {
      taskData.startDate = this.dateService.dateInputToISO(taskFormData.startDate);
    }

    // Fecha de fin
    const oldDueDate = this.dateService.formatDateForInput(oldTask.dueDate);
    const newDueDate = taskFormData.dueDate || '';
    if (oldDueDate !== newDueDate) {
      taskData.dueDate = this.dateService.dateInputToISO(taskFormData.dueDate);
    }

    // Cliente
    const oldClientId = typeof oldTask.clientId === 'object' ? oldTask.clientId._id : oldTask.clientId || '';
    if (taskFormData.clientId !== oldClientId) {
      taskData.clientId = taskFormData.clientId || undefined;
    }

    // Agentes (solo si el cliente es empresa)
    if (selectedClient?.type === 'empresa') {
      const oldAgentIds = (oldTask.agentIds || []).sort();
      const newAgentIds = (taskFormData.agentIds || []).sort();
      if (JSON.stringify(oldAgentIds) !== JSON.stringify(newAgentIds)) {
        taskData.agentIds = taskFormData.agentIds;
        taskData.agentNames = taskFormData.agentNames;
      }
    }

    // ColumnId - permitir edición desde el modal
    const oldColumnId = typeof oldTask.columnId === 'object' ? (oldTask.columnId as any)._id : oldTask.columnId || '';
    if (taskFormData.columnId && taskFormData.columnId !== oldColumnId) {
      taskData.columnId = taskFormData.columnId;
    }

    // Si no hay cambios, no hacer nada
    if (Object.keys(taskData).length === 0) {
      this.loadTasks(); // Recargar para asegurar sincronización
      return;
    }

    // Actualizar en el backend
    this.http.put<Task>(`${this.apiUrl}/tasks/${this.selectedTask._id}`, taskData).subscribe({
      next: (updatedTask) => {
        // Actualizar la tarea seleccionada
        const normalizedAssignees = (updatedTask.assignees || []).map(assignee => {
          if (typeof assignee === 'string') {
            return this.users.find(u => u._id === assignee) || assignee;
          }
          return assignee;
        }).filter(a => a !== undefined) as User[];

        this.selectedTask = {
          ...updatedTask,
          assignees: normalizedAssignees,
          attachments: (updatedTask.attachments || []).map(att => ({
            ...att,
            size: att.size || 0,
            url: att.url && !att.url.startsWith('http') && !att.url.startsWith('data:') && att.url.startsWith('/')
              ? `${this.staticFilesUrl}${att.url}`
              : att.url || ''
          }))
        };
        
        // Emitir evento de actualización para que el modal se actualice
        this.onTaskUpdated(this.selectedTask);
        
        // Recargar tareas para actualizar el calendario
        this.loadTasks();
      },
      error: (err) => {
        console.error('Error updating task', err);
        this.loadTasks(); // Recargar en caso de error
      }
    });
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
      dueDate: updatedTask.dueDate || undefined,
      startDate: updatedTask.startDate || undefined,
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
    return this.translationService.translate(`tasks.${priority}`) || priority;
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

  updateTaskDate(taskId: string, newDate: Date): void {
    const formattedDate = newDate.toISOString();
    
    // Update locally first
    const index = this.tasks.findIndex(t => t._id === taskId);
    if (index !== -1) {
      this.tasks[index] = {
        ...this.tasks[index],
        dueDate: formattedDate
      };
      this.updateCalendarEvents();
    }
    
    // Update in backend
    this.http.put<Task>(`${this.apiUrl}/tasks/${taskId}`, { dueDate: formattedDate }).subscribe({
      next: (updatedTask) => {
        const taskIndex = this.tasks.findIndex(t => t._id === taskId);
        if (taskIndex !== -1) {
          const normalizedAssignees = (updatedTask.assignees || []).map(assignee => {
            if (typeof assignee === 'string') {
              return this.users.find(u => u._id === assignee) || assignee;
            }
            return assignee;
          }).filter(a => a !== undefined) as User[];

          this.tasks[taskIndex] = {
            ...updatedTask,
            assignees: normalizedAssignees,
            attachments: (updatedTask.attachments || []).map(att => ({
              ...att,
              size: att.size || 0,
              url: att.url && !att.url.startsWith('http') && !att.url.startsWith('data:') && att.url.startsWith('/')
                ? `${this.staticFilesUrl}${att.url}`
                : att.url || ''
            }))
          };
          this.updateCalendarEvents();
        } else {
          this.loadTasks();
        }
      },
      error: (err) => {
        console.error('Error updating task date', err);
        this.loadTasks();
      }
    });
  }
}
