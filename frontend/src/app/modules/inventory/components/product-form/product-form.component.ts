import { Component, OnInit, HostListener, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { TranslationService } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { Subscription } from 'rxjs';

interface Supplier {
  _id: string;
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
}

interface Product {
  _id: string;
  name: string;
  description?: string;
  reference?: string;
  barcode?: string;
  unitOfMeasure: string;
  customUnit?: string;
  supplier?: Supplier;
  cost: number;
  price: number;
  stock: number;
  minStock?: number;
  maxStock?: number;
  location?: string;
  category?: string;
  brand?: string;
  isActive: boolean;
  image?: string;
  notes?: string;
}

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './product-form.component.html'
})
export class ProductFormComponent implements OnInit, OnDestroy {
  productId: string | null = null;
  isEditMode = false;
  loading = false;
  saving = false;

  get unitsOfMeasure(): { value: string; label: string }[] {
    return [
      { value: 'unidad', label: this.translationService.translate('inventory.unitUnidad') },
      { value: 'kg', label: this.translationService.translate('inventory.unitKg') },
      { value: 'g', label: this.translationService.translate('inventory.unitG') },
      { value: 'l', label: this.translationService.translate('inventory.unitL') },
      { value: 'ml', label: this.translationService.translate('inventory.unitMl') },
      { value: 'm', label: this.translationService.translate('inventory.unitM') },
      { value: 'cm', label: this.translationService.translate('inventory.unitCm') },
      { value: 'm²', label: this.translationService.translate('inventory.unitM2') },
      { value: 'm³', label: this.translationService.translate('inventory.unitM3') },
      { value: 'caja', label: this.translationService.translate('inventory.unitCaja') },
      { value: 'paquete', label: this.translationService.translate('inventory.unitPaquete') },
      { value: 'otro', label: this.translationService.translate('inventory.unitOtro') }
    ];
  }

  suppliers: Supplier[] = [];
  loadingSuppliers = false;
  selectedSupplierId: string | null = null;
  supplierSearchTerm = '';
  showSupplierDropdown = false;
  supplierFilter = '';
  
  unitSearchTerm = '';
  showUnitDropdown = false;
  unitFilter = '';

  productForm = {
    name: '',
    description: '',
    reference: '',
    barcode: '',
    unitOfMeasure: 'unidad',
    customUnit: '',
    supplierId: null as string | null,
    cost: 0,
    price: 0,
    stock: 0,
    minStock: 0,
    location: '',
    category: '',
    brand: '',
    isActive: true,
    image: '',
    notes: ''
  };

  selectedImageFile: File | null = null;
  imagePreview: string | null = null;
  uploadingImage = false;

  errors: { [key: string]: string } = {};
  private languageSubscription?: Subscription;
  @ViewChild('imageInput', { static: false }) imageInput?: ElementRef<HTMLInputElement>;

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadSuppliers();
    this.updateUnitSearchTerm();
    this.productId = this.route.snapshot.paramMap.get('id');
    if (this.productId) {
      this.isEditMode = true;
      this.loadProduct();
    }
    
    // Suscribirse a cambios de idioma para actualizar las unidades
    this.languageSubscription = this.translationService.getCurrentLanguage().subscribe(() => {
      this.updateUnitSearchTerm();
    });
  }

  ngOnDestroy(): void {
    if (this.languageSubscription) {
      this.languageSubscription.unsubscribe();
    }
  }

  loadSuppliers(): void {
    this.loadingSuppliers = true;
    this.http.get<Supplier[]>(`${this.apiUrl}/inventory/suppliers`).subscribe({
      next: (suppliers) => {
        this.suppliers = suppliers.filter(s => s.isActive !== false);
        this.loadingSuppliers = false;
        this.updateSupplierSearchTerm();
      },
      error: (err) => {
        console.error('Error loading suppliers', err);
        this.loadingSuppliers = false;
      }
    });
  }

  getFilteredSuppliers(): Supplier[] {
    if (!this.supplierFilter || this.supplierFilter.trim() === '') {
      return this.suppliers;
    }
    const search = this.supplierFilter.toLowerCase().trim();
    return this.suppliers.filter(supplier => 
      supplier.name.toLowerCase().includes(search) ||
      (supplier.contact && supplier.contact.toLowerCase().includes(search)) ||
      (supplier.email && supplier.email.toLowerCase().includes(search))
    );
  }

  getSupplierPlaceholder(): string {
    return `${this.translationService.translate('common.search')} ${this.translationService.translate('inventory.supplier')}`;
  }

  toggleSupplierDropdown(): void {
    this.showSupplierDropdown = !this.showSupplierDropdown;
    if (this.showSupplierDropdown) {
      this.supplierFilter = '';
    }
  }

  selectSupplier(supplier: Supplier): void {
    this.productForm.supplierId = supplier._id;
    this.supplierSearchTerm = supplier.name;
    this.showSupplierDropdown = false;
    this.supplierFilter = '';
  }

  updateSupplierSearchTerm(): void {
    if (this.productForm.supplierId) {
      const supplier = this.suppliers.find(s => s._id === this.productForm.supplierId);
      this.supplierSearchTerm = supplier ? supplier.name : '';
    } else {
      this.supplierSearchTerm = '';
    }
  }

  getFilteredUnits(): { value: string; label: string }[] {
    if (!this.unitFilter || this.unitFilter.trim() === '') {
      return this.unitsOfMeasure;
    }
    const search = this.unitFilter.toLowerCase().trim();
    return this.unitsOfMeasure.filter(unit => 
      unit.label.toLowerCase().includes(search) || 
      unit.value.toLowerCase().includes(search)
    );
  }

  getUnitPlaceholder(): string {
    return `${this.translationService.translate('common.search')} ${this.translationService.translate('inventory.unitOfMeasure')}`;
  }

  toggleUnitDropdown(): void {
    this.showUnitDropdown = !this.showUnitDropdown;
    if (this.showUnitDropdown) {
      this.unitFilter = '';
    }
  }

  selectUnit(unit: { value: string; label: string }): void {
    this.productForm.unitOfMeasure = unit.value;
    this.unitSearchTerm = unit.label;
    this.showUnitDropdown = false;
    this.unitFilter = '';
  }

  updateUnitSearchTerm(): void {
    const unit = this.unitsOfMeasure.find(u => u.value === this.productForm.unitOfMeasure);
    this.unitSearchTerm = unit ? unit.label : '';
  }

  loadProduct(): void {
    if (!this.productId) return;
    
    this.loading = true;
    this.http.get<Product>(`${this.apiUrl}/inventory/${this.productId}`).subscribe({
      next: (product) => {
        this.productForm = {
          name: product.name || '',
          description: product.description || '',
          reference: product.reference || '',
          barcode: product.barcode || '',
          unitOfMeasure: product.unitOfMeasure || 'unidad',
          customUnit: product.customUnit || '',
          supplierId: product.supplier?._id || null,
          cost: product.cost || 0,
          price: product.price || 0,
          stock: product.stock || 0,
          minStock: product.minStock || 0,
          location: product.location || '',
          category: product.category || '',
          brand: product.brand || '',
          isActive: product.isActive !== undefined ? product.isActive : true,
          image: product.image || '',
          notes: product.notes || ''
        };
        this.imagePreview = product.image || null;
        this.updateSupplierSearchTerm();
        this.updateUnitSearchTerm();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading product', err);
        this.loading = false;
        alert(this.translationService.translate('inventory.errorLoading') || 'Error al cargar el producto');
      }
    });
  }

  validateForm(): boolean {
    this.errors = {};

    if (!this.productForm.name || !this.productForm.name.trim()) {
      this.errors['name'] = this.translationService.translate('inventory.nameRequired') || 'El nombre es requerido';
    }

    if (this.productForm.cost < 0) {
      this.errors['cost'] = this.translationService.translate('inventory.costInvalid') || 'El costo debe ser mayor o igual a 0';
    }

    if (this.productForm.price < 0) {
      this.errors['price'] = this.translationService.translate('inventory.priceInvalid') || 'El precio debe ser mayor o igual a 0';
    }

    if (this.productForm.stock < 0) {
      this.errors['stock'] = this.translationService.translate('inventory.stockInvalid') || 'El stock debe ser mayor o igual a 0';
    }

    if (this.productForm.minStock && this.productForm.minStock < 0) {
      this.errors['minStock'] = this.translationService.translate('inventory.minStockInvalid') || 'El stock mínimo debe ser mayor o igual a 0';
    }

    if (this.productForm.unitOfMeasure === 'otro' && !this.productForm.customUnit?.trim()) {
      this.errors['customUnit'] = this.translationService.translate('inventory.customUnitRequired') || 'Debe especificar la unidad de medida';
    }

    return Object.keys(this.errors).length === 0;
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  saveProduct(): void {
    if (!this.validateForm()) {
      return;
    }

    this.saving = true;
    const productData: any = {
      name: this.productForm.name,
      description: this.productForm.description,
      reference: this.productForm.reference,
      barcode: this.productForm.barcode,
      unitOfMeasure: this.productForm.unitOfMeasure,
      customUnit: this.productForm.customUnit,
      cost: this.productForm.cost,
      price: this.productForm.price,
      stock: this.productForm.stock,
      minStock: this.productForm.minStock,
      location: this.productForm.location,
      category: this.productForm.category,
      brand: this.productForm.brand,
      isActive: this.productForm.isActive,
      image: this.productForm.image,
      notes: this.productForm.notes
    };

    // Si hay un supplierId seleccionado, buscar el supplier y agregar sus datos
    if (this.productForm.supplierId) {
      const selectedSupplier = this.suppliers.find(s => s._id === this.productForm.supplierId);
      if (selectedSupplier) {
        productData.supplier = {
          name: selectedSupplier.name,
          contact: selectedSupplier.contact || '',
          email: selectedSupplier.email || '',
          phone: selectedSupplier.phone || ''
        };
      }
    }

    if (this.isEditMode && this.productId) {
      this.http.put<Product>(`${this.apiUrl}/inventory/${this.productId}`, productData).subscribe({
        next: () => {
          this.saving = false;
          this.router.navigate(['/inventory']);
        },
        error: (err) => {
          console.error('Error updating product', err);
          this.saving = false;
          const errorMessage = err.error?.message || err.error?.error || 
            (this.translationService.translate('inventory.errorUpdating') || 'Error al actualizar el producto');
          alert(errorMessage);
        }
      });
    } else {
      this.http.post<Product>(`${this.apiUrl}/inventory`, productData).subscribe({
        next: () => {
          this.saving = false;
          this.router.navigate(['/inventory']);
        },
        error: (err) => {
          console.error('Error creating product', err);
          this.saving = false;
          const errorMessage = err.error?.message || err.error?.error || 
            (this.translationService.translate('inventory.errorCreating') || 'Error al crear el producto');
          alert(errorMessage);
        }
      });
    }
  }

  showCustomUnitInput(): boolean {
    return this.productForm.unitOfMeasure === 'otro';
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validar que sea una imagen
      if (!file.type.startsWith('image/')) {
        alert(this.translationService.translate('inventory.invalidImageType') || 'El archivo debe ser una imagen');
        return;
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(this.translationService.translate('inventory.imageTooLarge') || 'La imagen no debe exceder 5MB');
        return;
      }

      this.selectedImageFile = file;

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
        this.productForm.image = e.target.result as string; // Guardar como base64 por ahora
      };
      reader.readAsDataURL(file);
    }
  }

  triggerImageInput(): void {
    this.imageInput?.nativeElement.click();
  }

  removeImage(): void {
    this.selectedImageFile = null;
    this.imagePreview = null;
    this.productForm.image = '';
    if (this.imageInput) {
      this.imageInput.nativeElement.value = '';
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.supplier-dropdown-container')) {
      this.showSupplierDropdown = false;
    }
    if (!target.closest('.unit-dropdown-container')) {
      this.showUnitDropdown = false;
    }
  }
}
