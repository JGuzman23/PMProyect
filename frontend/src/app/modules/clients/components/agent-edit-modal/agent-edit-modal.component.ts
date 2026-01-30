import { Component, Input, Output, EventEmitter, HostListener, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

export interface Agent {
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

@Component({
  selector: 'app-agent-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './agent-edit-modal.component.html'
})
export class AgentEditModalComponent implements OnInit, OnChanges {
  @Input() isOpen: boolean = false;
  @Input() agents: Agent[] = [];
  @Input() autoAddAgent: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() agentsUpdated = new EventEmitter<Agent[]>();

  agentsForm: Agent[] = [];
  agentEmailErrors: { [key: number]: boolean } = {};
  
  // Para comboboxes de país y estado por agente
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
      'Monte Cristi', 'Monte Plata', 'Pedernales', 'Peravia', 'Puerto Plata', 'Samaná', 'Sánchez Ramírez', 'San Cristóbal',
      'San José de Ocoa', 'San Juan', 'San Pedro de Macorís', 'Santiago', 'Santiago Rodríguez', 'Santo Domingo', 'Valverde'
    ]
  };

  constructor(public translationService: TranslationService) {}

  ngOnInit(): void {
    this.loadAgents();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['agents'] && this.isOpen) {
      this.loadAgents();
    }
    if (changes['isOpen'] && this.isOpen && this.autoAddAgent) {
      // Si el modal se abre con autoAddAgent, agregar un agente vacío después de cargar
      setTimeout(() => {
        if (this.agentsForm.length === 0) {
          this.addAgent();
        }
      }, 0);
    }
  }

  loadAgents(): void {
    if (this.agents && this.agents.length > 0) {
      this.agentsForm = this.agents.map(agent => ({
        ...agent,
        address: agent.address || {
          street: '',
          city: '',
          state: '',
          zip: '',
          country: ''
        }
      }));
    } else {
      this.agentsForm = [];
    }
    this.initializeSearchTerms();
  }

  initializeSearchTerms(): void {
    this.agentsForm.forEach((agent: Agent, index: number) => {
      if (agent.address?.country) {
        const selectedCountry = this.countries.find(c => c.value === agent.address?.country);
        this.agentCountrySearchTerms[index] = selectedCountry ? selectedCountry.label : (agent.address?.country || '');
      } else {
        this.agentCountrySearchTerms[index] = '';
      }
      if (agent.address?.state) {
        this.agentStateSearchTerms[index] = agent.address.state;
      } else {
        this.agentStateSearchTerms[index] = '';
      }
    });
  }

  closeModal(): void {
    this.agentsForm = [];
    this.agentEmailErrors = {};
    this.close.emit();
  }

  addAgent(): void {
    this.agentsForm.push({
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
    const newIndex = this.agentsForm.length - 1;
    this.agentCountrySearchTerms[newIndex] = '';
    this.agentStateSearchTerms[newIndex] = '';
  }

  removeAgent(index: number): void {
    this.agentsForm.splice(index, 1);
    delete this.agentEmailErrors[index];
    delete this.agentCountrySearchTerms[index];
    delete this.agentStateSearchTerms[index];
    delete this.showAgentCountryDropdowns[index];
    delete this.showAgentStateDropdowns[index];
    delete this.agentCountryFilters[index];
    delete this.agentStateFilters[index];
  }

  isValidEmail(email: string): boolean {
    if (!email || email.trim() === '') return true; // Email opcional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validateAgentEmail(index: number): void {
    const agent = this.agentsForm[index];
    if (agent.email && agent.email.trim() !== '') {
      this.agentEmailErrors[index] = !this.isValidEmail(agent.email);
    } else {
      this.agentEmailErrors[index] = false;
    }
  }

  saveAgents(): void {
    // Validar que todos los agentes tengan nombre
    for (let i = 0; i < this.agentsForm.length; i++) {
      const agent = this.agentsForm[i];
      if (!agent.name || agent.name.trim() === '') {
        alert(this.translationService.translate('clients.agentNameRequired') || 'El nombre del agente es requerido');
        return;
      }
      if (agent.email && agent.email.trim() !== '' && !this.isValidEmail(agent.email)) {
        alert(`${this.translationService.translate('clients.invalidEmail') || 'El email no es válido'} (${this.translationService.translate('clients.agent') || 'Agente'} ${i + 1})`);
        return;
      }
    }

    // Filtrar agentes con nombre válido y preparar datos
    const validAgents = this.agentsForm
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

    this.agentsUpdated.emit(validAgents);
    this.closeModal();
  }

  // Métodos para comboboxes de país
  getStatesForAgentCountry(agentIndex: number): string[] {
    const country = this.agentsForm[agentIndex]?.address?.country || '';
    return this.statesByCountry[country] || [];
  }

  getFilteredAgentCountries(agentIndex: number): { value: string; label: string }[] {
    const filter = this.agentCountryFilters[agentIndex]?.toLowerCase().trim();
    if (!filter) {
      return this.countries;
    }
    return this.countries.filter(country =>
      country.label.toLowerCase().includes(filter) ||
      country.value.toLowerCase().includes(filter)
    );
  }

  getFilteredAgentStates(agentIndex: number): string[] {
    const states = this.getStatesForAgentCountry(agentIndex);
    const filter = this.agentStateFilters[agentIndex]?.toLowerCase().trim();
    if (!filter) {
      return states;
    }
    return states.filter(state => state.toLowerCase().includes(filter));
  }

  getAgentCountryPlaceholder(agentIndex: number): string {
    return `${this.translationService.translate('common.search')} ${this.translationService.translate('clients.country')}`;
  }

  getAgentStatePlaceholder(agentIndex: number): string {
    return `${this.translationService.translate('common.search')} ${this.translationService.translate('clients.state')}`;
  }

  toggleAgentCountryDropdown(agentIndex: number): void {
    this.showAgentCountryDropdowns[agentIndex] = !this.showAgentCountryDropdowns[agentIndex];
    if (this.showAgentCountryDropdowns[agentIndex]) {
      this.agentCountryFilters[agentIndex] = '';
    }
    this.closeOtherAgentDropdowns(agentIndex, 'country');
  }

  toggleAgentStateDropdown(agentIndex: number): void {
    const agent = this.agentsForm[agentIndex];
    if (!agent?.address?.country || this.getStatesForAgentCountry(agentIndex).length === 0) {
      return;
    }
    this.showAgentStateDropdowns[agentIndex] = !this.showAgentStateDropdowns[agentIndex];
    if (this.showAgentStateDropdowns[agentIndex]) {
      this.agentStateFilters[agentIndex] = '';
    }
    this.closeOtherAgentDropdowns(agentIndex, 'state');
  }

  selectAgentCountry(agentIndex: number, country: { value: string; label: string }): void {
    const agent = this.agentsForm[agentIndex];
    if (agent && agent.address) {
      agent.address.country = country.value;
      this.agentCountrySearchTerms[agentIndex] = country.label;
      this.showAgentCountryDropdowns[agentIndex] = false;
      this.agentCountryFilters[agentIndex] = '';
      this.onAgentCountryChange(agentIndex);
    }
  }

  selectAgentState(agentIndex: number, state: string): void {
    const agent = this.agentsForm[agentIndex];
    if (agent && agent.address) {
      agent.address.state = state;
      this.agentStateSearchTerms[agentIndex] = state;
      this.showAgentStateDropdowns[agentIndex] = false;
      this.agentStateFilters[agentIndex] = '';
    }
  }

  onAgentCountryChange(agentIndex: number): void {
    const agent = this.agentsForm[agentIndex];
    if (agent && agent.address) {
      agent.address.state = '';
      this.agentStateSearchTerms[agentIndex] = '';
    }
  }

  closeAgentDropdowns(agentIndex: number): void {
    this.showAgentCountryDropdowns[agentIndex] = false;
    this.showAgentStateDropdowns[agentIndex] = false;
  }

  closeOtherAgentDropdowns(currentIndex: number, type: 'country' | 'state'): void {
    this.agentsForm.forEach((_agent: Agent, index: number) => {
      if (index !== currentIndex) {
        this.showAgentCountryDropdowns[index] = false;
        this.showAgentStateDropdowns[index] = false;
      } else {
        if (type === 'country') {
          this.showAgentStateDropdowns[index] = false;
        } else {
          this.showAgentCountryDropdowns[index] = false;
        }
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    this.agentsForm.forEach((_agent: Agent, index: number) => {
      if (!target.closest(`.agent-country-dropdown-${index}`) && !target.closest(`.agent-state-dropdown-${index}`)) {
        this.closeAgentDropdowns(index);
      }
    });
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    if (this.isOpen) {
      this.closeModal();
    }
  }
}
