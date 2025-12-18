import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../../../environments/environment';

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
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './client-form.component.html'
})
export class ClientFormComponent implements OnInit {
  clientId: string | null = null;
  isEditMode = false;
  loading = false;
  currentStep = 1;
  totalSteps = 5;
  clientForm: any = {
    type: 'persona',
    name: '',
    email: '',
    phone: '',
    company: '',
    taxId: '',
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
    private router: Router
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
        this.clientForm = {
          type: client.type || 'persona',
          name: client.name,
          email: client.email || '',
          phone: client.phone || '',
          company: client.company || '',
          taxId: client.taxId || '',
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
      this.clientForm.taxId = '';
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
      1: 'Tipo y Datos Básicos',
      2: 'Información de Contacto',
      3: 'Dirección',
      4: this.clientForm.type === 'empresa' ? 'Agentes' : 'Documentos',
      5: 'Notas'
    };
    return titles[step] || '';
  }

  saveClient(): void {
    // Validación básica
    if (!this.clientForm.name || this.clientForm.name.trim() === '') {
      alert('El nombre es obligatorio');
      return;
    }

    // Preparar datos para enviar
    const dataToSend: any = {
      type: this.clientForm.type,
      name: this.clientForm.name.trim(),
      email: this.clientForm.email?.trim() || '',
      phone: this.clientForm.phone?.trim() || '',
      address: this.clientForm.address || {},
      notes: this.clientForm.notes?.trim() || ''
    };
    
    // Si es tipo empresa
    if (dataToSend.type === 'empresa') {
      // Agregar campos específicos de empresa
      if (this.clientForm.taxId) {
        dataToSend.taxId = this.clientForm.taxId.trim();
      }
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
          alert('Cliente actualizado correctamente');
          this.router.navigate(['/clients']);
        },
        error: (err) => {
          console.error('Error updating client', err);
          this.loading = false;
          const errorMessage = err.error?.message || err.error?.error || 'Error al actualizar el cliente';
          alert(`Error: ${errorMessage}`);
        }
      });
    } else {
      this.http.post(`${this.apiUrl}/clients`, dataToSend).subscribe({
        next: () => {
          alert('Cliente creado correctamente');
          this.router.navigate(['/clients']);
        },
        error: (err) => {
          console.error('Error creating client', err);
          this.loading = false;
          let errorMessage = 'Error al crear el cliente';
          
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
              errorMessage = `Errores de validación: ${validationErrors}`;
            }
          }
          
          alert(`Error: ${errorMessage}`);
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/clients']);
  }
}

