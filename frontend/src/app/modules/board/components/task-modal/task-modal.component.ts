import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { timeout, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';
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
  phone?: string;
  phones?: string[];
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
  labels?: any[];
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

@Component({
  selector: 'app-task-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './task-modal.component.html'
})
export class TaskModalComponent implements OnInit, OnChanges {
  @Input() task: Task | null = null;
  @Input() columns: Column[] = [];
  @Input() users: User[] = [];
  @Input() clients: Client[] = [];
  @Input() isOpen: boolean = false;
  
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();
  @Output() delete = new EventEmitter<string>();
  @Output() taskUpdated = new EventEmitter<Task>();

  isEditMode = false;
  showTaskActionsDropdown = false;
  showAssigneeDropdown = false;
  showAgentDropdown = false;
  showClientDropdown = false;
  showPriorityDropdown = false;
  showStatusDropdown = false;
  showAttachmentTitleModal = false;
  pendingFiles: File[] = [];
  attachmentTitle = '';
  uploadingFiles = false;
  uploadingAttachmentIds: Set<string> = new Set(); // Track which attachments are being uploaded
  pendingStatusId: string | null = null;
  // Notification state
  notification: { message: string; type: 'success' | 'error' | 'info' } | null = null;
  loadingUsers = false;
  loadingClients = false;
  showEmojiPicker = false;
  commentAttachments: File[] = [];
  commentAttachmentPreviews: { file: File; preview?: string }[] = [];
  
  taskForm = {
    title: '',
    description: '',
    priority: 'medium',
    assignees: [] as string[],
    dueDate: '',
    clientId: '',
    agentIds: [] as string[],
    agentNames: [] as string[],
    columnId: ''
  };
  
  attachments: Attachment[] = [];
  attachmentsByStatus: { [statusId: string]: Attachment[] } = {};
  comments: Comment[] = [];
  activityLog: ActivityLog[] = [];
  activityItems: ActivityItem[] = [];
  newCommentText: string = '';
  selectedClient: Client | null = null;
  
  clientSearchTerm = '';
  agentSearchTerm = '';
  assigneeSearchTerm = '';
  prioritySearchTerm = '';
  statusSearchTerm = '';
  filteredClients: Client[] = [];
  filteredAgents: Agent[] = [];
  filteredUsers: User[] = [];
  filteredPriorities: { value: string; label: string }[] = [];
  filteredColumns: Column[] = [];

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.updateFilteredPriorities();
    this.updateFilteredColumns();
    if (this.task) {
      this.loadTaskData();
    }
    if (this.clients.length > 0) {
      this.updateFilteredClients();
    }
    if (this.users.length > 0) {
      this.updateFilteredUsers();
    }
  }

  loadTaskData(): void {
    if (!this.task) return;
    
    const clientId = typeof this.task.clientId === 'object' ? this.task.clientId._id : this.task.clientId || '';
    const columnId = typeof this.task.columnId === 'object' ? this.task.columnId._id : this.task.columnId || '';
    this.taskForm = {
      title: this.task.title || '',
      description: this.task.description || '',
      priority: this.task.priority || 'medium',
      assignees: this.task.assignees ? this.task.assignees.map(u => typeof u === 'object' ? u._id : u) : [],
      dueDate: this.task.dueDate || '',
      clientId: clientId,
      agentIds: this.task.agentIds ? [...this.task.agentIds] : [],
      agentNames: this.task.agentNames ? [...this.task.agentNames] : [],
      columnId: columnId
    };
    
    if (clientId) {
      this.selectedClient = this.clients.find(c => c._id === clientId) || null;
      this.updateFilteredAgents();
    } else {
      this.selectedClient = null;
    }
    
    this.attachments = this.task.attachments || [];
    this.groupAttachmentsByStatus();
    this.comments = (this.task.comments || []).map(comment => ({
      ...comment,
      userId: typeof comment.userId === 'object' ? comment.userId : this.users.find(u => u._id === comment.userId) || comment.userId
    }));
    this.activityLog = (this.task.activityLog || []).map(activity => ({
      ...activity,
      userId: typeof activity.userId === 'object' ? activity.userId : this.users.find(u => u._id === activity.userId) || activity.userId
    }));
    this.combineActivitiesAndComments();
    this.isEditMode = false;
  }

  getCurrentColumnName(): string {
    const columnId = this.taskForm.columnId || (this.task && (typeof this.task.columnId === 'object' ? this.task.columnId._id : this.task.columnId)) || '';
    if (!columnId) return '';
    const column = this.columns.find(c => c._id === columnId);
    return column ? column.name : '';
  }

  resetForm(): void {
    this.taskForm = {
      title: '',
      description: '',
      priority: 'medium',
      assignees: [],
      dueDate: '',
      clientId: '',
      agentIds: [],
      agentNames: [],
      columnId: ''
    };
    this.selectedClient = null;
    this.attachments = [];
    this.attachmentsByStatus = {};
    this.comments = [];
    this.activityLog = [];
    this.activityItems = [];
    this.isEditMode = true;
  }

  closeModal(): void {
    this.close.emit();
  }

  enableEditMode(): void {
    this.isEditMode = true;
    setTimeout(() => {
      const editor = document.querySelector('.description-editor') as HTMLElement;
      if (editor) {
        editor.innerHTML = this.taskForm.description || '';
      }
    }, 0);
  }

  cancelEdit(): void {
    if (this.task) {
      this.loadTaskData();
    } else {
      this.resetForm();
    }
  }

  onSave(): void {
    this.save.emit(this.taskForm);
  }

  onDelete(): void {
    if (this.task) {
      this.delete.emit(this.task._id);
    }
  }

  // Métodos de utilidad que se necesitarán en el template
  getClientName(clientId: string | Client | undefined): string {
    if (!clientId) return '';
    if (typeof clientId === 'object') {
      return clientId.name + (clientId.type === 'persona' && clientId.lastName ? ` ${clientId.lastName}` : '');
    }
    const client = this.clients.find(c => c._id === clientId);
    return client ? client.name + (client.type === 'persona' && client.lastName ? ` ${client.lastName}` : '') : '';
  }

  getClientById(clientId: string | Client | undefined): Client | null {
    if (!clientId) return null;
    if (typeof clientId === 'object') {
      return clientId;
    }
    return this.clients.find(c => c._id === clientId) || null;
  }

  getClientIdAsString(): string | undefined {
    if (this.taskForm.clientId && this.taskForm.clientId.trim() !== '') {
      return this.taskForm.clientId;
    }
    if (this.task?.clientId) {
      if (typeof this.task.clientId === 'string') {
        return this.task.clientId;
      } else if (this.task.clientId._id) {
        return this.task.clientId._id;
      }
    }
    return undefined;
  }

  getSelectedAssignees(): User[] {
    return this.users.filter(u => this.taskForm.assignees.includes(u._id));
  }

  getSelectedAssigneesNames(): string {
    if (this.taskForm.assignees.length === 0) {
      return this.translationService.translate('tasks.noAssignee');
    }
    const names = this.taskForm.assignees
      .map(id => {
        const user = this.users.find(u => u._id === id);
        return user ? `${user.firstName} ${user.lastName}` : '';
      })
      .filter(name => name);
    return names.length > 0 ? names.join(', ') : this.translationService.translate('tasks.noAssignee');
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
    return classes[priority] || 'bg-gray-100 text-gray-800';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getAttachmentsForStatus(statusId: string): Attachment[] {
    return this.attachmentsByStatus[statusId] || [];
  }

  groupAttachmentsByStatus(): void {
    this.attachmentsByStatus = {};
    this.attachments.forEach(attachment => {
      if (attachment.statusId) {
        if (!this.attachmentsByStatus[attachment.statusId]) {
          this.attachmentsByStatus[attachment.statusId] = [];
        }
        this.attachmentsByStatus[attachment.statusId].push(attachment);
      }
    });
  }

  onClientChange(): void {
    if (this.taskForm.clientId) {
      this.selectedClient = this.clients.find(c => c._id === this.taskForm.clientId) || null;
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
      this.taskForm.agentIds.splice(index, 1);
      this.taskForm.agentNames.splice(index, 1);
    } else {
      this.taskForm.agentIds.push(agentIndex.toString());
      this.taskForm.agentNames.push(agent.name);
    }
  }

  toggleAssignee(userId: string): void {
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

  getAgentIndex(agent: Agent): number {
    if (!this.selectedClient?.agents) return -1;
    return this.selectedClient.agents.findIndex(a => a.name === agent.name && a.email === agent.email);
  }

  updateFilteredClients(): void {
    if (!this.clientSearchTerm.trim()) {
      this.filteredClients = this.clients;
      return;
    }
    const search = this.clientSearchTerm.toLowerCase();
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

  updateFilteredUsers(): void {
    if (!this.assigneeSearchTerm.trim()) {
      this.filteredUsers = this.users;
      return;
    }
    const search = this.assigneeSearchTerm.toLowerCase();
    this.filteredUsers = this.users.filter(user => {
      const firstName = user.firstName.toLowerCase();
      const lastName = user.lastName.toLowerCase();
      const email = user.email.toLowerCase();
      return firstName.includes(search) || lastName.includes(search) || email.includes(search);
    });
  }

  updateFilteredColumns(): void {
    if (!this.statusSearchTerm.trim()) {
      this.filteredColumns = this.columns;
      return;
    }
    const search = this.statusSearchTerm.toLowerCase();
    this.filteredColumns = this.columns.filter(column =>
      column.name.toLowerCase().includes(search)
    );
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
    if (!target.closest('.status-dropdown-container')) {
      this.showStatusDropdown = false;
      this.statusSearchTerm = '';
    }
    if (!target.closest('.task-actions-dropdown-container')) {
      this.showTaskActionsDropdown = false;
    }
    if (!target.closest('.emoji-picker-container') && !target.closest('.emoji-picker-button')) {
      this.showEmojiPicker = false;
    }
  }

  // Métodos para comentarios y actividades
  getUserInitials(user: User | string): string {
    if (typeof user === 'object' && user) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return '??';
  }

  getUserName(user: User | string): string {
    if (typeof user === 'object' && user) {
      return `${user.firstName} ${user.lastName}`;
    }
    return 'Usuario desconocido';
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

  formatCommentDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return this.translationService.translate('tasks.moment');
    if (diffMins < 60) {
      const minutes = diffMins === 1 ? this.translationService.translate('tasks.minutes') : this.translationService.translate('tasks.minutesPlural');
      return `${this.translationService.translate('tasks.ago')} ${diffMins} ${minutes}`;
    }
    if (diffHours < 24) {
      const hours = diffHours === 1 ? this.translationService.translate('tasks.hours') : this.translationService.translate('tasks.hoursPlural');
      return `${this.translationService.translate('tasks.ago')} ${diffHours} ${hours}`;
    }
    if (diffDays < 7) {
      const days = diffDays === 1 ? this.translationService.translate('tasks.days') : this.translationService.translate('tasks.daysPlural');
      return `${this.translationService.translate('tasks.ago')} ${diffDays} ${days}`;
    }
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
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
        return this.translationService.translate('tasks.taskCreated');
      case 'status_changed':
        return this.translationService.translate('tasks.statusChanged');
      case 'priority_changed':
        const priorityMap: { [key: string]: string } = {
          'low': this.translationService.translate('tasks.low'),
          'medium': this.translationService.translate('tasks.medium'),
          'high': this.translationService.translate('tasks.high'),
          'urgent': this.translationService.translate('tasks.urgent')
        };
        const oldPriority = priorityMap[activity.oldValue] || activity.oldValue;
        const newPriority = priorityMap[activity.newValue] || activity.newValue;
        return `${this.translationService.translate('tasks.priorityChanged')} ${this.translationService.translate('tasks.from')} ${oldPriority} ${this.translationService.translate('tasks.to')} ${newPriority}`;
      case 'assignees_changed':
        return this.translationService.translate('tasks.assigneesModified');
      case 'client_changed':
        return this.translationService.translate('tasks.clientModified');
      case 'due_date_changed':
        return this.translationService.translate('tasks.dueDateModified');
      case 'title_changed':
        return `${this.translationService.translate('tasks.titleChanged')} ${this.translationService.translate('tasks.from')} "${activity.oldValue}" ${this.translationService.translate('tasks.to')} "${activity.newValue}"`;
      case 'description_changed':
        return this.translationService.translate('tasks.descriptionModified');
      case 'comment_added':
        return this.translationService.translate('tasks.commentAdded');
      case 'attachment_added':
        return this.translationService.translate('tasks.attachmentAdded');
      case 'attachment_removed':
        return this.translationService.translate('tasks.attachmentRemoved');
      default:
        return 'Cambio realizado';
    }
  }

  combineActivitiesAndComments(): void {
    const items: ActivityItem[] = [];

    this.comments.forEach(comment => {
      items.push({
        type: 'comment',
        data: comment,
        timestamp: comment.createdAt ? new Date(comment.createdAt) : new Date()
      });
    });

    this.activityLog.forEach(activity => {
      items.push({
        type: 'activity',
        data: activity,
        timestamp: activity.createdAt ? new Date(activity.createdAt) : new Date()
      });
    });

    this.activityItems = items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  onCommentChange(event: Event): void {
    const target = event.target as HTMLElement;
    this.newCommentText = target.innerHTML || '';
  }

  toggleEmojiPicker(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.showEmojiPicker = !this.showEmojiPicker;
    
    // Calcular posición después de que Angular renderice el elemento
    if (this.showEmojiPicker) {
      setTimeout(() => {
        this.positionEmojiPicker(event);
      }, 0);
    }
  }

  positionEmojiPicker(event?: Event): void {
    if (!event) return;
    
    const button = (event.target as HTMLElement).closest('.emoji-picker-button') as HTMLElement;
    if (!button) return;
    
    setTimeout(() => {
      const buttonRect = button.getBoundingClientRect();
      const picker = document.querySelector('.emoji-picker-container .fixed') as HTMLElement;
      
      if (picker) {
        // Calcular posición: intentar arriba primero, si no cabe, abajo
        const spaceAbove = buttonRect.top;
        const spaceBelow = window.innerHeight - buttonRect.bottom;
        const pickerHeight = 384; // max-h-96 = 384px
        
        if (spaceAbove >= pickerHeight + 10) {
          // Colocar arriba
          picker.style.top = `${buttonRect.top - pickerHeight - 8}px`;
          picker.style.bottom = 'auto';
        } else if (spaceBelow >= pickerHeight + 10) {
          // Colocar abajo
          picker.style.top = `${buttonRect.bottom + 8}px`;
          picker.style.bottom = 'auto';
        } else {
          // Si no cabe en ninguno, colocar arriba pero ajustar
          picker.style.top = '10px';
          picker.style.bottom = 'auto';
          picker.style.maxHeight = `${spaceAbove - 20}px`;
        }
        
        // Posición horizontal: alinear con el botón
        picker.style.left = `${buttonRect.left}px`;
        picker.style.right = 'auto';
        
        // Asegurar que no se salga de la pantalla
        setTimeout(() => {
          const pickerRect = picker.getBoundingClientRect();
          if (pickerRect.right > window.innerWidth) {
            picker.style.left = `${window.innerWidth - pickerRect.width - 10}px`;
          }
          if (pickerRect.left < 0) {
            picker.style.left = '10px';
          }
        }, 0);
      }
    }, 0);
  }

  insertEmoji(emoji: string): void {
    const editor = document.querySelector('.comment-editor') as HTMLElement;
    if (editor) {
      editor.focus();
      
      try {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          const textNode = document.createTextNode(emoji);
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          // Si no hay selección, insertar al final
          const range = document.createRange();
          range.selectNodeContents(editor);
          range.collapse(false);
          const textNode = document.createTextNode(emoji);
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          const newSelection = window.getSelection();
          if (newSelection) {
            newSelection.removeAllRanges();
            newSelection.addRange(range);
          }
        }
      } catch (e) {
        // Fallback: insertar al final si hay algún error
        const textNode = document.createTextNode(emoji);
        editor.appendChild(textNode);
      }
      
      // Actualizar el texto del comentario
      this.newCommentText = editor.innerHTML;
      
      // Disparar evento input para actualizar el modelo
      const inputEvent = new Event('input', { bubbles: true });
      editor.dispatchEvent(inputEvent);
    }
    this.showEmojiPicker = false;
  }

  // Lista de emojis comunes organizados por categorías
  emojiCategories = [
    {
      name: 'Smileys',
      emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔']
    },
    {
      name: 'Emotions',
      emojis: ['😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤐', '🤨', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐']
    },
    {
      name: 'Gestures',
      emojis: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏']
    },
    {
      name: 'Objects',
      emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐']
    },
    {
      name: 'Symbols',
      emojis: ['✅', '❌', '⭕', '❓', '❔', '❗', '❕', '➕', '➖', '➗', '✖️', '💯', '🔝', '🔚', '🔙', '🔛', '🔜', '🔃', '🔄', '🔂', '🔁', '🔀', '🔉', '🔊', '🔈', '🔇', '🔔', '🔕', '📢', '📣']
    }
  ];

  triggerCommentFileInput(inputId: string): void {
    setTimeout(() => {
      const input = document.getElementById(inputId) as HTMLInputElement;
      if (input) {
        input.click();
      } else {
        console.error(`Input with id ${inputId} not found`);
      }
    }, 0);
  }

  onCommentFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      files.forEach(file => {
        this.commentAttachments.push(file);
        const preview: { file: File; preview?: string } = { file };
        
        // Crear preview para imágenes
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e: any) => {
            preview.preview = e.target.result;
          };
          reader.readAsDataURL(file);
        }
        
        this.commentAttachmentPreviews.push(preview);
      });
      
      // Limpiar el input para permitir seleccionar el mismo archivo de nuevo
      input.value = '';
    }
  }

  removeCommentAttachment(index: number): void {
    this.commentAttachments.splice(index, 1);
    this.commentAttachmentPreviews.splice(index, 1);
  }

  addComment(): void {
    if (!this.task) return;

    const editor = document.querySelector('.comment-editor') as HTMLElement;
    if (!editor) return;

    const text = editor.innerText || editor.textContent || '';
    const html = editor.innerHTML || '';
    
    // Permitir enviar comentario si hay texto o archivos adjuntos
    if (!text.trim() && !html.replace(/<[^>]*>/g, '').trim() && this.commentAttachments.length === 0) {
      return;
    }

    const currentUser = this.authService.currentUser;
    if (!currentUser) {
      console.error('No user logged in');
      return;
    }

    const commentText = html.trim() || text.trim();
    
    // Si hay archivos adjuntos, subirlos primero
    if (this.commentAttachments.length > 0) {
      this.uploadCommentAttachments(commentText);
    } else {
      // Si no hay archivos, enviar el comentario normalmente
      this.sendComment(commentText);
    }
  }

  uploadCommentAttachments(commentText: string): void {
    if (!this.task) return;

    const uploadPromises = this.commentAttachments.map(file => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      formData.append('statusId', ''); // Sin statusId para adjuntos de comentarios
      formData.append('statusName', '');

      return this.http.post<any>(`${this.apiUrl}/tasks/upload`, formData).toPromise();
    });

    Promise.all(uploadPromises).then((responses) => {
      if (!this.task) return;
      
      // Agregar los attachments a la tarea
      const newAttachments = responses.map(response => {
        let fullUrl = response.url;
        if (!fullUrl.startsWith('http') && !fullUrl.startsWith('data:')) {
          if (fullUrl.startsWith('/')) {
            const baseUrl = this.apiUrl.replace('/api', '');
            fullUrl = `${baseUrl}${fullUrl}`;
          } else {
            fullUrl = `${this.apiUrl}/${fullUrl}`;
          }
        }
        return {
          url: fullUrl,
          name: response.name || '',
          title: response.title || response.name || '',
          size: response.size || 0,
          statusId: '',
          statusName: '',
          uploadedAt: response.uploadedAt || new Date().toISOString()
        };
      });

      // Actualizar la tarea con los nuevos attachments
      const currentAttachments = this.task.attachments || [];
      const updatedAttachments = [...currentAttachments, ...newAttachments];

      this.http.put(`${this.apiUrl}/tasks/${this.task._id}`, {
        attachments: updatedAttachments
      }).subscribe({
        next: () => {
          // Después de agregar los attachments, enviar el comentario
          this.sendComment(commentText);
        },
        error: (err) => {
          console.error('Error adding attachments to task', err);
          // Aún así, enviar el comentario
          this.sendComment(commentText);
        }
      });
    }).catch(err => {
      console.error('Error uploading comment attachments', err);
      alert(this.translationService.translate('tasks.errorUploadingFile'));
    });
  }

  sendComment(commentText: string): void {
    if (!this.task) return;

    const commentData = { text: commentText };

    this.http.post(`${this.apiUrl}/tasks/${this.task._id}/comments`, commentData).subscribe({
      next: (response: any) => {
        // Limpiar el editor y los adjuntos
        const editor = document.querySelector('.comment-editor') as HTMLElement;
        this.newCommentText = '';
        if (editor) {
          editor.innerHTML = '';
        }
        this.commentAttachments = [];
        this.commentAttachmentPreviews = [];
        
        if (!this.task) return;
        
        this.http.get<Task>(`${this.apiUrl}/tasks/${this.task._id}`).subscribe({
          next: (updatedTask) => {
            this.task = updatedTask;
            this.taskUpdated.emit(updatedTask);
            this.comments = (updatedTask.comments || []).map(comment => ({
              ...comment,
              userId: typeof comment.userId === 'object' ? comment.userId : this.users.find(u => u._id === comment.userId) || comment.userId
            }));
            this.activityLog = (updatedTask.activityLog || []).map(activity => ({
              ...activity,
              userId: typeof activity.userId === 'object' ? activity.userId : this.users.find(u => u._id === activity.userId) || activity.userId
            }));
            this.combineActivitiesAndComments();
            // Recargar attachments
            this.attachments = updatedTask.attachments || [];
            this.groupAttachmentsByStatus();
          },
          error: (err) => {
            console.error('Error reloading task', err);
          }
        });
      },
      error: (err) => {
        console.error('Error adding comment', err);
        alert(this.translationService.translate('tasks.errorAddingComment'));
      }
    });
  }

  // Métodos para adjuntos
  onFileSelected(event: Event, statusId: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      // Si estamos en modo vista, activar modo edición para poder subir archivos
      if (!this.isEditMode && this.task) {
        this.enableEditMode();
      }
      // Procesar todos los archivos seleccionados
      const files = Array.from(input.files);
      if (files.length > 0) {
        this.pendingFiles = files;
        this.pendingStatusId = statusId;
        this.attachmentTitle = '';
        this.showAttachmentTitleModal = true;
      }
      // Limpiar el input para permitir subir el mismo archivo de nuevo
      input.value = '';
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

  confirmAttachmentUpload(): void {
    if (this.pendingFiles.length > 0 && this.attachmentTitle.trim() && this.pendingStatusId && this.task) {
      const statusId = this.pendingStatusId; // Guardar en variable local para TypeScript
      const status = this.columns.find(c => c._id === statusId);
      // Subir todos los archivos con el mismo título
      this.pendingFiles.forEach((file, index) => {
        const title = this.pendingFiles.length > 1 
          ? `${this.attachmentTitle.trim()} (${index + 1})`
          : this.attachmentTitle.trim();
        this.uploadFile(file, title, statusId, status?.name || '');
      });
      this.cancelAttachmentUpload();
    } else if (this.pendingFiles.length > 0 && !this.pendingStatusId) {
      alert(this.translationService.translate('tasks.mustSelectStatus'));
    } else if (this.pendingFiles.length > 0) {
      alert(this.translationService.translate('tasks.mustEnterTitle'));
    }
  }

  cancelAttachmentUpload(): void {
    this.showAttachmentTitleModal = false;
    this.pendingFiles = [];
    this.pendingStatusId = null;
    this.attachmentTitle = '';
  }

  uploadFile(file: File, title: string, statusId: string, statusName: string): void {
    if (!this.task) return;
    
    this.uploadingFiles = true;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('statusId', statusId);
    formData.append('statusName', statusName);
    formData.append('taskId', this.task._id);

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
      this.uploadingAttachmentIds.add(tempId); // Mark as uploading
      this.groupAttachmentsByStatus();
    };
    
    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else {
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
      this.uploadingAttachmentIds.add(tempId); // Mark as uploading
      this.groupAttachmentsByStatus();
    }

    // Subir archivo al servidor con timeout extendido para archivos grandes (10 minutos)
    this.http.post(`${this.apiUrl}/tasks/upload`, formData, {
      reportProgress: true,
      observe: 'body'
    }).pipe(
      timeout(600000), // 10 minutos en milisegundos
      catchError(err => {
        if (err.name === 'TimeoutError') {
          return throwError(() => ({ 
            status: 504, 
            error: { 
              error: 'Timeout', 
              message: 'La subida del archivo está tomando demasiado tiempo. Por favor, verifique su conexión e intente nuevamente.' 
            } 
          }));
        }
        return throwError(() => err);
      })
    ).subscribe({
      next: (response: any) => {
        const index = this.attachments.findIndex(a => a._id === tempId);
        if (index !== -1 && response.url) {
          let fullUrl = response.url;
          if (!fullUrl.startsWith('http') && !fullUrl.startsWith('data:')) {
            if (fullUrl.startsWith('/')) {
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
            uploadedAt: response.uploadedAt || new Date().toISOString(),
            _id: response._id || tempId
          };
          this.uploadingAttachmentIds.delete(tempId); // Remove from uploading set
          this.groupAttachmentsByStatus();
        }
        this.uploadingFiles = false;
        
        // Mostrar notificación de éxito
        this.showNotification('tasks.fileUploadedSuccessfully', 'success');
        
        // Recargar la tarea para obtener los datos actualizados
        if (this.task) {
          this.http.get<Task>(`${this.apiUrl}/tasks/${this.task._id}`).subscribe({
            next: (updatedTask) => {
              this.task = updatedTask;
              this.taskUpdated.emit(updatedTask);
              this.attachments = updatedTask.attachments || [];
              this.groupAttachmentsByStatus();
            },
            error: (err) => console.error('Error reloading task', err)
          });
        }
      },
      error: (err) => {
        console.error('Error uploading file', err);
        this.attachments = this.attachments.filter(a => a._id !== tempId);
        this.uploadingAttachmentIds.delete(tempId); // Remove from uploading set
        this.uploadingFiles = false;
        
        // Mostrar mensaje de error más específico
        let errorMessage = this.translationService.translate('tasks.errorUploadingFile');
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.error?.error === 'File too large') {
          errorMessage = 'El archivo excede el tamaño máximo permitido de 25 MB';
        } else if (err.status === 0 || err.status === 504) {
          errorMessage = 'Timeout: El archivo es muy grande o la conexión es lenta. Intente con un archivo más pequeño.';
        }
        alert(errorMessage);
      }
    });
  }

  downloadAttachment(attachment: Attachment): void {
    if (!attachment.url) return;
    
    if (attachment.url.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = attachment.url;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    
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
        window.open(attachment.url, '_blank');
      });
  }

  isAttachmentUploading(attachment: Attachment): boolean {
    return attachment._id ? this.uploadingAttachmentIds.has(attachment._id) : false;
  }

  showNotification(messageKey: string, type: 'success' | 'error' | 'info' = 'success'): void {
    const message = this.translationService.translate(messageKey) || messageKey;
    this.notification = { message, type };
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      this.notification = null;
    }, 3000);
  }

  closeNotification(): void {
    this.notification = null;
  }

  removeAttachment(statusId: string, index: number): void {
    if (!this.task) return;
    
    const statusAttachments = this.attachmentsByStatus[statusId] || [];
    const attachment = statusAttachments[index];
    if (attachment && attachment._id) {
      // Eliminar del servidor si tiene _id (no es un preview temporal)
      if (!attachment._id.startsWith('temp')) {
        this.http.delete(`${this.apiUrl}/tasks/${this.task._id}/attachments/${attachment._id}`).subscribe({
          next: () => {
            // Recargar la tarea para obtener los datos actualizados
            if (!this.task) return;
            this.http.get<Task>(`${this.apiUrl}/tasks/${this.task._id}`).subscribe({
              next: (updatedTask) => {
                this.task = updatedTask;
                this.taskUpdated.emit(updatedTask);
                this.attachments = updatedTask.attachments || [];
                this.groupAttachmentsByStatus();
              },
              error: (err) => console.error('Error reloading task', err)
            });
          },
          error: (err) => {
            console.error('Error deleting attachment', err);
            alert(this.translationService.translate('tasks.errorDeletingFile'));
          }
        });
      } else {
        // Si es un preview temporal, solo eliminarlo localmente
        const globalIndex = this.attachments.findIndex(a => a._id === attachment._id);
        if (globalIndex !== -1) {
          this.attachments.splice(globalIndex, 1);
          this.groupAttachmentsByStatus();
        }
      }
    }
  }

  isImageFile(url: string, name: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const extension = name.toLowerCase().substring(name.lastIndexOf('.'));
    return imageExtensions.includes(extension) || url.toLowerCase().includes('image');
  }

  getFileIcon(name: string): string {
    const extension = name.toLowerCase().substring(name.lastIndexOf('.') + 1);
    const iconMap: { [key: string]: string } = {
      'pdf': '📄',
      'doc': '📝',
      'docx': '📝',
      'xls': '📊',
      'xlsx': '📊',
      'zip': '📦',
      'rar': '📦'
    };
    return iconMap[extension] || '📎';
  }

  handleImageError(event: Event, attachment: Attachment): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  shouldShowAgent(): boolean {
    if (!this.task?.clientId) return false;
    if (typeof this.task.clientId === 'object') {
      return this.task.clientId.type === 'empresa';
    }
    const client = this.clients.find(c => c._id === this.task?.clientId);
    return client?.type === 'empresa';
  }

  getTaskAgentName(task: Task): string {
    if (task.agentNames && task.agentNames.length > 0) {
      return task.agentNames.join(', ');
    }
    return '';
  }

  // Métodos para el editor de descripción
  onDescriptionChange(event: Event): void {
    const target = event.target as HTMLElement;
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
      this.taskForm.description = editor.innerHTML;
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

  removeFormat(event?: Event): void {
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

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task'] && this.task) {
      this.loadTaskData();
    } else if (changes['task'] && !this.task) {
      this.resetForm();
    }
    if (changes['clients'] && this.clients.length > 0) {
      this.updateFilteredClients();
    }
    if (changes['users'] && this.users.length > 0) {
      this.updateFilteredUsers();
    }
  }
}

