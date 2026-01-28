import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { TranslationService } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

interface Supplier {
  _id: string;
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
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

interface Country {
  value: string;
  label: string;
}

@Component({
  selector: 'app-supplier-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './supplier-form.component.html'
})
export class SupplierFormComponent implements OnInit {
  supplierId: string | null = null;
  isEditMode = false;
  loading = false;
  saving = false;
  countrySearchTerm = '';
  stateSearchTerm = '';
  showCountryDropdown = false;
  showStateDropdown = false;
  countryFilter = '';
  stateFilter = '';

  supplierForm = {
    name: '',
    contact: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: ''
    },
    notes: '',
    isActive: true
  };

  errors: { [key: string]: string } = {};

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

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.supplierId = this.route.snapshot.paramMap.get('id');
    if (this.supplierId) {
      this.isEditMode = true;
      this.loadSupplier();
    }
    this.updateSearchTerms();
  }

  updateSearchTerms(): void {
    if (this.supplierForm.address.country) {
      const country = this.countries.find(c => c.value === this.supplierForm.address.country);
      this.countrySearchTerm = country ? country.label : '';
    }
    this.stateSearchTerm = this.supplierForm.address.state || '';
  }

  getStatesForCountry(): string[] {
    const country = this.supplierForm.address?.country || '';
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
    this.supplierForm.address.state = '';
    this.stateSearchTerm = '';
  }

  getCountryPlaceholder(): string {
    return `${this.translationService.translate('common.search')} ${this.translationService.translate('admin.country')}`;
  }

  getStatePlaceholder(): string {
    return `${this.translationService.translate('common.search')} ${this.translationService.translate('admin.state')}`;
  }

  toggleCountryDropdown(): void {
    this.showCountryDropdown = !this.showCountryDropdown;
    if (this.showCountryDropdown) {
      this.countryFilter = '';
    }
  }

  toggleStateDropdown(): void {
    if (!this.supplierForm.address.country || this.getStatesForCountry().length === 0) {
      return;
    }
    this.showStateDropdown = !this.showStateDropdown;
    if (this.showStateDropdown) {
      this.stateFilter = '';
    }
  }

  selectCountry(country: { value: string; label: string }): void {
    this.supplierForm.address.country = country.value;
    this.countrySearchTerm = country.label;
    this.showCountryDropdown = false;
    this.countryFilter = '';
    this.onCountryChange();
  }

  selectState(state: string): void {
    this.supplierForm.address.state = state;
    this.stateSearchTerm = state;
    this.showStateDropdown = false;
    this.stateFilter = '';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.country-dropdown-container')) {
      this.showCountryDropdown = false;
    }
    if (!target.closest('.state-dropdown-container')) {
      this.showStateDropdown = false;
    }
  }

  loadSupplier(): void {
    if (!this.supplierId) return;
    
    this.loading = true;
    this.http.get<Supplier>(`${this.apiUrl}/inventory/suppliers/${this.supplierId}`).subscribe({
      next: (supplier) => {
        this.supplierForm = {
          name: supplier.name || '',
          contact: supplier.contact || '',
          email: supplier.email || '',
          phone: supplier.phone || '',
          address: {
            street: supplier.address?.street || '',
            city: supplier.address?.city || '',
            state: supplier.address?.state || '',
            zip: supplier.address?.zip || '',
            country: supplier.address?.country || ''
          },
          notes: supplier.notes || '',
          isActive: supplier.isActive !== undefined ? supplier.isActive : true
        };
        this.updateSearchTerms();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading supplier', err);
        this.loading = false;
        alert(this.translationService.translate('admin.errorLoadingSupplier') || 'Error al cargar el suplidor');
      }
    });
  }

  validateForm(): boolean {
    this.errors = {};

    if (!this.supplierForm.name || !this.supplierForm.name.trim()) {
      this.errors['name'] = this.translationService.translate('admin.nameRequired') || 'El nombre es requerido';
    }

    if (this.supplierForm.email && !this.isValidEmail(this.supplierForm.email)) {
      this.errors['email'] = this.translationService.translate('admin.invalidEmail') || 'El email no es válido';
    }

    return Object.keys(this.errors).length === 0;
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  saveSupplier(): void {
    if (!this.validateForm()) {
      return;
    }

    this.saving = true;

    if (this.isEditMode && this.supplierId) {
      this.http.put<Supplier>(`${this.apiUrl}/inventory/suppliers/${this.supplierId}`, this.supplierForm).subscribe({
        next: () => {
          this.saving = false;
          this.router.navigate(['/admin/suppliers']);
        },
        error: (err) => {
          console.error('Error updating supplier', err);
          this.saving = false;
          const errorMessage = err.error?.message || err.error?.error || 
            (this.translationService.translate('admin.errorUpdatingSupplier') || 'Error al actualizar el suplidor');
          alert(errorMessage);
        }
      });
    } else {
      this.http.post<Supplier>(`${this.apiUrl}/inventory/suppliers`, this.supplierForm).subscribe({
        next: () => {
          this.saving = false;
          this.router.navigate(['/admin/suppliers']);
        },
        error: (err) => {
          console.error('Error creating supplier', err);
          this.saving = false;
          const errorMessage = err.error?.message || err.error?.error || 
            (this.translationService.translate('admin.errorCreatingSupplier') || 'Error al crear el suplidor');
          alert(errorMessage);
        }
      });
    }
  }
}
