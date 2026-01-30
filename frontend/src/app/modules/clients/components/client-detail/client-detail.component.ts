import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, RouterLink, FormsModule, TranslatePipe, TaskModalComponent],
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

  // Agent Modal
  showAgentModal = false;
  selectedAgent: Agent | null = null;
  selectedAgentIndex: number = -1;
  isEditingAgent = false;
  isAddingAgent = false;

  // Agent Address Comboboxes
  agentCountrySearchTerm = '';
  agentStateSearchTerm = '';
  showAgentCountryDropdown = false;
  showAgentStateDropdown = false;
  agentCountryFilter = '';
  agentStateFilter = '';

  // Países y estados
  countries = [
    { value: 'Estados Unidos', label: 'Estados Unidos' },
    { value: 'Canadá', label: 'Canadá' },
    { value: 'México', label: 'México' },
    { value: 'República Dominicana', label: 'República Dominicana' }
  ];

  statesByCountry: { [key: string]: string[] } = {
    'Estados Unidos': [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
      'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
      'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
      'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina',
      'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
      'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
    ],
    'Canadá': [
      'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories',
      'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'
    ],
    'México': [
      'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua', 'Ciudad de México',
      'Coahuila', 'Colima', 'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán',
      'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa',
      'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
    ],
    'República Dominicana': [
      'Azua', 'Baoruco', 'Barahona', 'Dajabón', 'Distrito Nacional', 'Duarte', 'El Seibo', 'Espaillat', 'Hato Mayor',
      'Hermanas Mirabal', 'Independencia', 'La Altagracia', 'La Romana', 'La Vega', 'María Trinidad Sánchez', 'Monseñor Nouel',
      'Monte Cristi', 'Monte Plata', 'Pedernales', 'Peravia', 'Puerto Plata', 'Samaná', 'Sánchez Ramírez', 'San Cristóbal',
      'San José de Ocoa', 'San Juan', 'San Pedro de Macorís', 'Santiago', 'Santiago Rodríguez', 'Santo Domingo', 'Valverde'
    ]
  };

  // Agent Pagination
  agentCurrentPage = 1;
  agentItemsPerPage = 5;
  get agentTotalPages(): number {
    if (!this.client || !this.client.agents) return 0;
    return Math.ceil(this.client.agents.length / this.agentItemsPerPage);
  }
  get paginatedAgents(): Agent[] {
    if (!this.client || !this.client.agents) return [];
    const start = (this.agentCurrentPage - 1) * this.agentItemsPerPage;
    const end = start + this.agentItemsPerPage;
    return this.client.agents.slice(start, end);
  }
  get agentStartIndex(): number {
    return (this.agentCurrentPage - 1) * this.agentItemsPerPage;
  }

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

  // Agent methods
  viewAgent(agent: Agent, index: number): void {
    // Calcular el índice real en el array completo
    const realIndex = this.agentStartIndex + index;
    this.selectedAgent = {
      ...agent,
      address: agent.address || {
        street: '',
        city: '',
        state: '',
        zip: '',
        country: ''
      }
    };
    this.selectedAgentIndex = realIndex;
    this.isEditingAgent = false;
    this.isAddingAgent = false;
    this.initializeAgentSearchTerms();
    this.showAgentModal = true;
  }

  editAgent(agent: Agent, index: number): void {
    // Calcular el índice real en el array completo
    const realIndex = this.agentStartIndex + index;
    this.selectedAgent = {
      ...agent,
      address: agent.address || {
        street: '',
        city: '',
        state: '',
        zip: '',
        country: ''
      }
    };
    this.selectedAgentIndex = realIndex;
    this.isEditingAgent = true;
    this.isAddingAgent = false;
    this.initializeAgentSearchTerms();
    this.showAgentModal = true;
  }

  addNewAgent(): void {
    this.selectedAgent = {
      name: '',
      phone: '',
      email: '',
      address: {
        street: '',
        city: '',
        state: '',
        zip: '',
        country: ''
      }
    };
    this.selectedAgentIndex = -1;
    this.isEditingAgent = true;
    this.isAddingAgent = true;
    this.agentCountrySearchTerm = '';
    this.agentStateSearchTerm = '';
    this.showAgentModal = true;
  }

  initializeAgentSearchTerms(): void {
    if (this.selectedAgent?.address?.country) {
      const selectedCountry = this.countries.find(c => c.value === this.selectedAgent?.address?.country);
      this.agentCountrySearchTerm = selectedCountry ? selectedCountry.label : (this.selectedAgent.address.country || '');
    } else {
      this.agentCountrySearchTerm = '';
    }
    if (this.selectedAgent?.address?.state) {
      this.agentStateSearchTerm = this.selectedAgent.address.state;
    } else {
      this.agentStateSearchTerm = '';
    }
  }

  // Agent Pagination methods
  agentPreviousPage(): void {
    if (this.agentCurrentPage > 1) {
      this.agentCurrentPage--;
    }
  }

  agentNextPage(): void {
    if (this.agentCurrentPage < this.agentTotalPages) {
      this.agentCurrentPage++;
    }
  }

  agentGoToPage(page: number): void {
    if (page >= 1 && page <= this.agentTotalPages) {
      this.agentCurrentPage = page;
    }
  }

  deleteAgent(index: number): void {
    if (!this.client || !this.client.agents) return;
    
    // Calcular el índice real en el array completo
    const realIndex = this.agentStartIndex + index;
    const agent = this.client.agents[realIndex];
    const confirmMessage = `${this.translationService.translate('clients.confirmDeleteAgent') || '¿Está seguro de que desea eliminar al agente'} "${agent.name}"?`;
    
    if (confirm(confirmMessage)) {
      // Crear una copia de los agentes sin el agente eliminado
      const updatedAgents = this.client.agents.filter((_, i) => i !== realIndex);
      
      // Ajustar la página si es necesario
      if (this.paginatedAgents.length === 1 && this.agentCurrentPage > 1) {
        this.agentCurrentPage--;
      }
      
      // Actualizar el cliente
      const updateData = {
        ...this.client,
        agents: updatedAgents.map(agent => ({
          name: agent.name.trim(),
          phone: agent.phone?.trim() || '',
          email: agent.email?.trim() || '',
          address: agent.address ? {
            street: agent.address.street?.trim() || '',
            city: agent.address.city?.trim() || '',
            state: agent.address.state?.trim() || '',
            zip: agent.address.zip?.trim() || '',
            country: agent.address.country?.trim() || ''
          } : undefined
        }))
      };

      this.http.put<Client>(`${this.apiUrl}/clients/${this.client._id}`, updateData).subscribe({
        next: (updatedClient) => {
          this.client = updatedClient;
          alert(this.translationService.translate('clients.agentDeletedSuccessfully') || 'Agente eliminado exitosamente');
        },
        error: (err) => {
          console.error('Error deleting agent', err);
          alert(this.translationService.translate('clients.errorDeletingAgent') || 'Error al eliminar el agente');
        }
      });
    }
  }

  closeAgentModal(): void {
    this.showAgentModal = false;
    this.selectedAgent = null;
    this.selectedAgentIndex = -1;
    this.isEditingAgent = false;
    this.isAddingAgent = false;
    this.agentCountrySearchTerm = '';
    this.agentStateSearchTerm = '';
    this.showAgentCountryDropdown = false;
    this.showAgentStateDropdown = false;
    this.agentCountryFilter = '';
    this.agentStateFilter = '';
  }

  // Agent Address Combobox methods
  getStatesForAgentCountry(): string[] {
    const country = this.selectedAgent?.address?.country || '';
    return this.statesByCountry[country] || [];
  }

  getFilteredAgentCountries(): { value: string; label: string }[] {
    const filter = this.agentCountryFilter?.toLowerCase().trim();
    if (!filter) {
      return this.countries;
    }
    return this.countries.filter(country =>
      country.label.toLowerCase().includes(filter) ||
      country.value.toLowerCase().includes(filter)
    );
  }

  getFilteredAgentStates(): string[] {
    const states = this.getStatesForAgentCountry();
    const filter = this.agentStateFilter?.toLowerCase().trim();
    if (!filter) {
      return states;
    }
    return states.filter(state => state.toLowerCase().includes(filter));
  }

  getAgentCountryPlaceholder(): string {
    return `${this.translationService.translate('common.search')} ${this.translationService.translate('clients.country')}`;
  }

  getAgentStatePlaceholder(): string {
    return `${this.translationService.translate('common.search')} ${this.translationService.translate('clients.state')}`;
  }

  toggleAgentCountryDropdown(): void {
    this.showAgentCountryDropdown = !this.showAgentCountryDropdown;
    if (this.showAgentCountryDropdown) {
      this.agentCountryFilter = '';
    }
    this.showAgentStateDropdown = false;
  }

  toggleAgentStateDropdown(): void {
    if (!this.selectedAgent?.address?.country || this.getStatesForAgentCountry().length === 0) {
      return;
    }
    this.showAgentStateDropdown = !this.showAgentStateDropdown;
    if (this.showAgentStateDropdown) {
      this.agentStateFilter = '';
    }
    this.showAgentCountryDropdown = false;
  }

  selectAgentCountry(country: { value: string; label: string }): void {
    if (this.selectedAgent && this.selectedAgent.address) {
      this.selectedAgent.address.country = country.value;
      this.agentCountrySearchTerm = country.label;
      this.showAgentCountryDropdown = false;
      this.agentCountryFilter = '';
      this.onAgentCountryChange();
    }
  }

  selectAgentState(state: string): void {
    if (this.selectedAgent && this.selectedAgent.address) {
      this.selectedAgent.address.state = state;
      this.agentStateSearchTerm = state;
      this.showAgentStateDropdown = false;
      this.agentStateFilter = '';
    }
  }

  onAgentCountryChange(): void {
    if (this.selectedAgent && this.selectedAgent.address) {
      this.selectedAgent.address.state = '';
      this.agentStateSearchTerm = '';
    }
  }

  closeAgentDropdowns(): void {
    this.showAgentCountryDropdown = false;
    this.showAgentStateDropdown = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.agent-country-dropdown-modal') && !target.closest('.agent-state-dropdown-modal')) {
      this.closeAgentDropdowns();
    }
  }

  saveAgent(agent: Agent): void {
    if (!this.client) return;

    // Validar nombre
    if (!agent.name || agent.name.trim() === '') {
      alert(this.translationService.translate('clients.agentNameRequired') || 'El nombre del agente es requerido');
      return;
    }

    // Validar email si está presente
    if (agent.email && agent.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(agent.email)) {
        alert(this.translationService.translate('clients.invalidEmail') || 'El email no es válido');
        return;
      }
    }

    // Preparar el agente para guardar
    const agentToSave = {
      name: agent.name.trim(),
      phone: agent.phone?.trim() || '',
      email: agent.email?.trim() || '',
      address: agent.address ? {
        street: agent.address.street?.trim() || '',
        city: agent.address.city?.trim() || '',
        state: agent.address.state?.trim() || '',
        zip: agent.address.zip?.trim() || '',
        country: agent.address.country?.trim() || ''
      } : undefined
    };

    // Actualizar o agregar el agente
    let updatedAgents: Agent[];
    if (this.isAddingAgent) {
      // Agregar nuevo agente
      updatedAgents = [...(this.client.agents || []), agentToSave];
      // Ir a la última página después de agregar
      this.agentCurrentPage = Math.ceil(updatedAgents.length / this.agentItemsPerPage);
    } else {
      // Actualizar agente existente
      updatedAgents = [...(this.client.agents || [])];
      if (this.selectedAgentIndex >= 0 && this.selectedAgentIndex < updatedAgents.length) {
        updatedAgents[this.selectedAgentIndex] = agentToSave;
      } else {
        return; // Índice inválido
      }
    }

    // Actualizar el cliente
    const updateData = {
      ...this.client,
      agents: updatedAgents.map(agent => ({
        name: agent.name.trim(),
        phone: agent.phone?.trim() || '',
        email: agent.email?.trim() || '',
        address: agent.address ? {
          street: agent.address.street?.trim() || '',
          city: agent.address.city?.trim() || '',
          state: agent.address.state?.trim() || '',
          zip: agent.address.zip?.trim() || '',
          country: agent.address.country?.trim() || ''
        } : undefined
      }))
    };

    this.http.put<Client>(`${this.apiUrl}/clients/${this.client._id}`, updateData).subscribe({
      next: (updatedClient) => {
        this.client = updatedClient;
        const message = this.isAddingAgent 
          ? (this.translationService.translate('clients.agentAddedSuccessfully') || 'Agente agregado exitosamente')
          : (this.translationService.translate('clients.agentUpdatedSuccessfully') || 'Agente actualizado exitosamente');
        alert(message);
        this.closeAgentModal();
      },
      error: (err) => {
        console.error('Error saving agent', err);
        const errorMessage = this.isAddingAgent
          ? (this.translationService.translate('clients.errorAddingAgent') || 'Error al agregar el agente')
          : (this.translationService.translate('clients.errorUpdatingAgent') || 'Error al actualizar el agente');
        alert(errorMessage);
      }
    });
  }
}

