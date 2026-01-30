import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { TranslationService } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

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

interface Client {
  _id: string;
  type: 'empresa' | 'persona';
  name: string;
  email: string;
  phone?: string;
  phones?: string[];
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
  selector: 'app-client-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './client-form.component.html'
})
export class ClientFormComponent implements OnInit {
  clientId: string | null = null;
  isEditMode = false;
  loading = false;
  emailError = false;
  agentEmailErrors: { [key: number]: boolean } = {};
  // Agent Modal (same as client-detail)
  showAgentModal = false;
  selectedAgent: Agent | null = null;
  selectedAgentIndex: number = -1;
  isEditingAgent = false;
  isAddingAgent = false;
  agentCountrySearchTerm: string = '';
  agentStateSearchTerm: string = '';
  showAgentCountryDropdown: boolean = false;
  showAgentStateDropdown: boolean = false;
  agentCountryFilter: string = '';
  agentStateFilter: string = '';

  // Agent Pagination (for edit mode)
  agentCurrentPage = 1;
  agentItemsPerPage = 5;
  get agentTotalPages(): number {
    if (!this.clientForm.agents || this.clientForm.agents.length === 0) return 0;
    return Math.ceil(this.clientForm.agents.length / this.agentItemsPerPage);
  }
  get paginatedAgents(): Agent[] {
    if (!this.clientForm.agents || this.clientForm.agents.length === 0) return [];
    const start = (this.agentCurrentPage - 1) * this.agentItemsPerPage;
    const end = start + this.agentItemsPerPage;
    return this.clientForm.agents.slice(start, end);
  }
  get agentStartIndex(): number {
    return (this.agentCurrentPage - 1) * this.agentItemsPerPage;
  }
  countrySearchTerm = '';
  stateSearchTerm = '';
  showCountryDropdown = false;
  showStateDropdown = false;
  countryFilter = '';
  stateFilter = '';
  
  // Para agentes: arrays para manejar múltiples dropdowns
  agentCountrySearchTerms: { [key: number]: string } = {};
  agentStateSearchTerms: { [key: number]: string } = {};
  showAgentCountryDropdowns: { [key: number]: boolean } = {};
  showAgentStateDropdowns: { [key: number]: boolean } = {};
  agentCountryFilters: { [key: number]: string } = {};
  agentStateFilters: { [key: number]: string } = {};

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
      'Monte Cristi', 'Monte Plata', 'Pedernales', 'Peravia', 'Puerto Plata', 'Samaná', 'San Cristóbal', 'San José de Ocoa',
      'San Juan', 'San Pedro de Macorís', 'Sánchez Ramírez', 'Santiago', 'Santiago Rodríguez', 'Santo Domingo', 'Valverde'
    ]
  };

  getStatesForCountry(): string[] {
    const country = this.clientForm.address?.country || '';
    return this.statesByCountry[country] || [];
  }

  getFilteredCountries(): { value: string; label: string }[] {
    if (!this.countryFilter || this.countryFilter.trim() === '') {
      return this.countries;
    }
    const search = this.countryFilter.toLowerCase().trim();
    return this.countries.filter(country => 
      country.label.toLowerCase().includes(search) || 
      country.value.toLowerCase().includes(search)
    );
  }

  getFilteredStates(): string[] {
    const states = this.getStatesForCountry();
    if (!this.stateFilter || this.stateFilter.trim() === '') {
      return states;
    }
    const search = this.stateFilter.toLowerCase().trim();
    return states.filter(state => state.toLowerCase().includes(search));
  }

  onCountryChange(): void {
    this.clientForm.address.state = '';
    this.stateSearchTerm = '';
  }

  getCountryPlaceholder(): string {
    return `${this.translationService.translate('common.search')} ${this.translationService.translate('clients.country')}`;
  }

  getStatePlaceholder(): string {
    return `${this.translationService.translate('common.search')} ${this.translationService.translate('clients.state')}`;
  }

  toggleCountryDropdown(): void {
    this.showCountryDropdown = !this.showCountryDropdown;
    if (this.showCountryDropdown) {
      this.countryFilter = '';
    }
  }

  toggleStateDropdown(): void {
    if (!this.clientForm.address.country || this.getStatesForCountry().length === 0) {
      return;
    }
    this.showStateDropdown = !this.showStateDropdown;
    if (this.showStateDropdown) {
      this.stateFilter = '';
    }
  }

  selectCountry(country: { value: string; label: string }): void {
    this.clientForm.address.country = country.value;
    this.countrySearchTerm = country.label;
    this.showCountryDropdown = false;
    this.countryFilter = '';
    this.onCountryChange();
  }

  selectState(state: string): void {
    this.clientForm.address.state = state;
    this.stateSearchTerm = state;
    this.showStateDropdown = false;
    this.stateFilter = '';
  }

  closeDropdowns(): void {
    this.showCountryDropdown = false;
    this.showStateDropdown = false;
  }


  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.country-dropdown-container') && !target.closest('.state-dropdown-container')) {
      this.closeDropdowns();
    }
    // Cerrar dropdowns de agente modal si se hace clic fuera
    if (!target.closest('.agent-country-dropdown-modal') && !target.closest('.agent-state-dropdown-modal')) {
      this.closeAgentDropdowns();
    }
  }

  currentStep = 1;
  totalSteps = 5;
  clientForm: any = {
    type: 'persona',
    name: '',
    email: '',
    phones: ['', ''],
    company: '',
    website: '',
    agents: [],
    lastName: '',
    documentType: '',
    documentNumber: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: ''
    },
    notes: ''
  };

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.clientId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.clientId;
    
    if (this.isEditMode && this.clientId) {
      this.loadClient(this.clientId);
    }
  }

  loadClient(id: string): void {
    this.loading = true;
    this.http.get<Client>(`${this.apiUrl}/clients/${id}`).subscribe({
      next: (client) => {
        // Convertir phone (string) o phones (array) a array de 2 elementos
        let phones: string[] = ['', ''];
        if (client.phones && Array.isArray(client.phones)) {
          phones = [...client.phones];
          // Asegurar que siempre hay 2 elementos
          while (phones.length < 2) {
            phones.push('');
          }
          phones = phones.slice(0, 2);
        } else if (client.phone) {
          phones[0] = client.phone;
        }

        this.clientForm = {
          type: client.type || 'persona',
          name: client.name,
          email: client.email || '',
          phones: phones,
          company: client.company || '',
          website: client.website || '',
          agents: client.agents ? client.agents.map(agent => ({
            ...agent,
            address: agent.address || {
              street: '',
              city: '',
              state: '',
              zip: '',
              country: ''
            }
          })) : [],
          lastName: client.lastName || '',
          documentType: client.documentType || '',
          documentNumber: client.documentNumber || '',
          address: client.address || {
            street: '',
            city: '',
            state: '',
            zip: '',
            country: ''
          },
          notes: client.notes || ''
        };
        // Inicializar términos de búsqueda con los valores seleccionados
        if (this.clientForm.address?.country) {
          const selectedCountry = this.countries.find(c => c.value === this.clientForm.address.country);
          this.countrySearchTerm = selectedCountry ? selectedCountry.label : this.clientForm.address.country;
        }
        if (this.clientForm.address?.state) {
          this.stateSearchTerm = this.clientForm.address.state;
        }
        // Inicializar términos de búsqueda para los agentes
        this.clientForm.agents.forEach((agent: Agent, index: number) => {
          if (agent.address?.country) {
            const selectedCountry = this.countries.find(c => c.value === agent.address?.country);
            this.agentCountrySearchTerms[index] = selectedCountry ? selectedCountry.label : (agent.address?.country || '');
          }
          if (agent.address?.state) {
            this.agentStateSearchTerms[index] = agent.address.state;
          }
        });
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading client', err);
        this.loading = false;
      }
    });
  }

  addAgent(): void {
    this.clientForm.agents.push({
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
    });
  }

  removeAgent(index: number): void {
    this.clientForm.agents.splice(index, 1);
  }


  // Agent methods (same as client-detail)
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

  deleteAgent(index: number): void {
    if (!this.clientForm.agents) return;
    
    // Calcular el índice real en el array completo
    const realIndex = this.agentStartIndex + index;
    const agent = this.clientForm.agents[realIndex];
    const confirmMessage = `${this.translationService.translate('clients.confirmDeleteAgent') || '¿Está seguro de que desea eliminar al agente'} "${agent.name}"?`;
    
    if (confirm(confirmMessage)) {
      // Crear una copia de los agentes sin el agente eliminado
      const updatedAgents = this.clientForm.agents.filter((_: Agent, i: number) => i !== realIndex);
      this.clientForm.agents = updatedAgents;
      
      // Ajustar la página si es necesario
      if (this.paginatedAgents.length === 1 && this.agentCurrentPage > 1) {
        this.agentCurrentPage--;
      }
      
      // Limpiar términos de búsqueda del agente eliminado
      delete this.agentCountrySearchTerms[realIndex];
      delete this.agentStateSearchTerms[realIndex];
      delete this.showAgentCountryDropdowns[realIndex];
      delete this.showAgentStateDropdowns[realIndex];
      delete this.agentCountryFilters[realIndex];
      delete this.agentStateFilters[realIndex];
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

  saveAgent(agent: Agent): void {
    if (!this.clientForm.agents) {
      this.clientForm.agents = [];
    }

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
      updatedAgents = [...(this.clientForm.agents || []), agentToSave];
      // Ir a la última página después de agregar
      this.agentCurrentPage = Math.ceil(updatedAgents.length / this.agentItemsPerPage);
    } else {
      // Actualizar agente existente
      updatedAgents = [...(this.clientForm.agents || [])];
      if (this.selectedAgentIndex >= 0 && this.selectedAgentIndex < updatedAgents.length) {
        updatedAgents[this.selectedAgentIndex] = agentToSave;
      } else {
        return; // Índice inválido
      }
    }

    // Actualizar clientForm.agents
    this.clientForm.agents = updatedAgents.map(agent => ({
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
    }));

    // Reinicializar términos de búsqueda para todos los agentes
    this.clientForm.agents.forEach((agent: Agent, index: number) => {
      if (agent.address?.country) {
        const selectedCountry = this.countries.find(c => c.value === agent.address?.country);
        this.agentCountrySearchTerms[index] = selectedCountry ? selectedCountry.label : (agent.address.country || '');
      } else {
        this.agentCountrySearchTerms[index] = '';
      }
      if (agent.address?.state) {
        this.agentStateSearchTerms[index] = agent.address.state;
      } else {
        this.agentStateSearchTerms[index] = '';
      }
    });

    this.closeAgentModal();
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

  onTypeChange(): void {
    // Limpiar campos específicos del otro tipo cuando se cambia
    if (this.clientForm.type === 'empresa') {
      this.clientForm.lastName = '';
      this.clientForm.documentType = '';
      this.clientForm.documentNumber = '';
    } else {
      this.clientForm.company = '';
      this.clientForm.website = '';
      this.clientForm.agents = [];
    }
  }

  nextStep(): void {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  goToStep(step: number): void {
    if (step >= 1 && step <= this.totalSteps) {
      this.currentStep = step;
    }
  }

  getStepTitle(step: number): string {
    const titles: { [key: number]: string } = {
      1: this.translationService.translate('clients.step1'),
      2: this.translationService.translate('clients.step2'),
      3: this.translationService.translate('clients.step3'),
      4: this.clientForm.type === 'empresa' ? this.translationService.translate('clients.step4Agents') : this.translationService.translate('clients.step4Documents'),
      5: this.translationService.translate('clients.step5')
    };
    return titles[step] || '';
  }

  isValidEmail(email: string): boolean {
    if (!email || email.trim() === '') {
      return true; // Email vacío es válido (opcional)
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  validateClientEmail(): void {
    if (this.clientForm.email && this.clientForm.email.trim() !== '') {
      this.emailError = !this.isValidEmail(this.clientForm.email);
    } else {
      this.emailError = false;
    }
  }

  validateAgentEmail(index: number): void {
    const agent = this.clientForm.agents[index];
    if (agent && agent.email && agent.email.trim() !== '') {
      this.agentEmailErrors[index] = !this.isValidEmail(agent.email);
    } else {
      this.agentEmailErrors[index] = false;
    }
  }

  saveClient(): void {
    // Validación básica
    if (!this.clientForm.name || this.clientForm.name.trim() === '') {
      alert(this.translationService.translate('clients.nameRequired'));
      return;
    }

    // Validar email del cliente
    if (this.clientForm.email && this.clientForm.email.trim() !== '' && !this.isValidEmail(this.clientForm.email)) {
      alert(this.translationService.translate('clients.invalidEmail') || 'El email no es válido');
      return;
    }

    // Validar emails de agentes (si es empresa)
    if (this.clientForm.type === 'empresa' && this.clientForm.agents) {
      for (let i = 0; i < this.clientForm.agents.length; i++) {
        const agent = this.clientForm.agents[i];
        if (agent.email && agent.email.trim() !== '' && !this.isValidEmail(agent.email)) {
          alert(`${this.translationService.translate('clients.invalidEmail') || 'El email no es válido'} (${this.translationService.translate('clients.agent') || 'Agente'} ${i + 1})`);
          return;
        }
      }
    }

    // Preparar datos para enviar
    // Filtrar teléfonos vacíos y enviar como array
    const phones = (this.clientForm.phones || [])
      .map((phone: string) => phone?.trim() || '')
      .filter((phone: string) => phone !== '');

    const dataToSend: any = {
      type: this.clientForm.type,
      name: this.clientForm.name.trim(),
      email: this.clientForm.email?.trim() || '',
      phones: phones,
      address: this.clientForm.address || {},
      notes: this.clientForm.notes?.trim() || ''
    };
    
    // Si es tipo empresa
    if (dataToSend.type === 'empresa') {
      // Agregar campos específicos de empresa
      if (this.clientForm.website) {
        dataToSend.website = this.clientForm.website.trim();
      }
      
      // Filtrar y agregar agentes válidos
      if (this.clientForm.agents && Array.isArray(this.clientForm.agents)) {
        dataToSend.agents = this.clientForm.agents
          .filter((agent: Agent) => agent.name && agent.name.trim() !== '')
          .map((agent: Agent) => ({
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
          }));
      } else {
        dataToSend.agents = [];
      }
    } 
    // Si es tipo persona
    else if (dataToSend.type === 'persona') {
      if (this.clientForm.lastName) {
        dataToSend.lastName = this.clientForm.lastName.trim();
      }
      if (this.clientForm.documentType) {
        dataToSend.documentType = this.clientForm.documentType;
      }
      if (this.clientForm.documentNumber) {
        dataToSend.documentNumber = this.clientForm.documentNumber.trim();
      }
    }

    this.loading = true;

    if (this.isEditMode && this.clientId) {
      this.http.put(`${this.apiUrl}/clients/${this.clientId}`, dataToSend).subscribe({
        next: () => {
          alert(this.translationService.translate('clients.updatedSuccessfully'));
          this.router.navigate(['/clients']);
        },
        error: (err) => {
          console.error('Error updating client', err);
          this.loading = false;
          const errorMessage = err.error?.message || err.error?.error || this.translationService.translate('clients.errorUpdating');
          alert(`${this.translationService.translate('common.error')}: ${errorMessage}`);
        }
      });
    } else {
      this.http.post(`${this.apiUrl}/clients`, dataToSend).subscribe({
        next: () => {
          alert(this.translationService.translate('clients.createdSuccessfully'));
          this.router.navigate(['/clients']);
        },
        error: (err) => {
          console.error('Error creating client', err);
          this.loading = false;
          let errorMessage = this.translationService.translate('clients.errorCreating');
          
          if (err.error) {
            if (err.error.message) {
              errorMessage = err.error.message;
            } else if (err.error.error) {
              errorMessage = err.error.error;
            } else if (typeof err.error === 'string') {
              errorMessage = err.error;
            } else if (err.error.errors) {
              // Errores de validación de Mongoose
              const validationErrors = Object.values(err.error.errors)
                .map((e: any) => e.message)
                .join(', ');
              errorMessage = `${this.translationService.translate('clients.validationErrors')}: ${validationErrors}`;
            }
          }
          
          alert(`${this.translationService.translate('common.error')}: ${errorMessage}`);
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/clients']);
  }
}

