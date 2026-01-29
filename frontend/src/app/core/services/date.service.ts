import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DateService {
  
  /**
   * Convierte una fecha ISO/UTC a formato YYYY-MM-DD usando la zona horaria local del usuario
   * Esto evita problemas de "off-by-one day" cuando se muestran fechas en inputs de tipo date
   */
  formatDateForInput(dateString: string | undefined | null): string {
    if (!dateString) return '';
    
    // Crear fecha desde string ISO
    const date = new Date(dateString);
    
    // Usar componentes locales para evitar problemas de timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  /**
   * Convierte una fecha en formato YYYY-MM-DD a ISO string usando la zona horaria local
   * Esto asegura que la fecha se guarde correctamente según la zona horaria del usuario
   */
  dateInputToISO(dateInput: string | undefined | null): string | undefined {
    if (!dateInput) return undefined;
    
    // Parsear la fecha en formato YYYY-MM-DD
    const [year, month, day] = dateInput.split('-').map(Number);
    
    // Crear fecha usando componentes locales (esto respeta la zona horaria del usuario)
    const date = new Date(year, month - 1, day);
    
    // Convertir a ISO string
    return date.toISOString();
  }

  /**
   * Formatea una fecha para mostrar usando el locale del usuario
   */
  formatDateForDisplay(dateString: string | undefined | null, locale: string = 'es-ES'): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  /**
   * Obtiene la zona horaria del usuario
   */
  getUserTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  /**
   * Compara dos fechas normalizadas (solo fecha, sin hora) usando la zona horaria local
   */
  compareDates(date1: string | undefined | null, date2: string | undefined | null): boolean {
    if (!date1 || !date2) return false;
    
    const d1 = this.formatDateForInput(date1);
    const d2 = this.formatDateForInput(date2);
    
    return d1 === d2;
  }
}
