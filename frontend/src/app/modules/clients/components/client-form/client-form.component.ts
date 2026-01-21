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
  countrySearchTerm = '';
  stateSearchTerm = '';
  showCountryDropdown = false;
  showStateDropdown = false;
  countryFilter = '';
  stateFilter = '';

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
          agents: client.agents ? [...client.agents] : [],
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
      email: ''
    });
  }

  removeAgent(index: number): void {
    this.clientForm.agents.splice(index, 1);
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
            email: agent.email?.trim() || ''
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

