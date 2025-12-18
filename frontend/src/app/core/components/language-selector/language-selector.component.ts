import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService, Language } from '../../services/translation.service';

interface LanguageOption {
  code: Language;
  name: string;
  flag: string;
  countryCode: string; // Para CSS flags
}

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './language-selector.component.html'
})
export class LanguageSelectorComponent implements OnInit {
  currentLanguage: Language = 'es';
  showDropdown = false;

  languages: LanguageOption[] = [
    { code: 'es', name: 'Español', flag: '🇪🇸', countryCode: 'es' },
    { code: 'en', name: 'English', flag: '🇬🇧', countryCode: 'gb' },
    { code: 'fr', name: 'Français', flag: '🇫🇷', countryCode: 'fr' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪', countryCode: 'de' },
    { code: 'pt', name: 'Português', flag: '🇵🇹', countryCode: 'pt' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹', countryCode: 'it' }
  ];

  constructor(private translationService: TranslationService) {}

  ngOnInit(): void {
    this.translationService.getCurrentLanguage().subscribe(lang => {
      this.currentLanguage = lang;
    });
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.language-selector-container')) {
      this.showDropdown = false;
    }
  }

  selectLanguage(lang: Language): void {
    this.translationService.setLanguage(lang);
    this.showDropdown = false;
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.showDropdown = !this.showDropdown;
  }

  getCurrentLanguageName(): string {
    const lang = this.languages.find(l => l.code === this.currentLanguage);
    return lang ? lang.name : 'Español';
  }

  getCurrentLanguageFlag(): string {
    const lang = this.languages.find(l => l.code === this.currentLanguage);
    return lang ? lang.flag : '🇪🇸';
  }

  getCurrentLanguageCountryCode(): string {
    const lang = this.languages.find(l => l.code === this.currentLanguage);
    return lang ? lang.countryCode : 'es';
  }

  getFlagUrl(countryCode: string): string {
    // Usando un servicio de banderas gratuito con mejor calidad
    return `https://flagcdn.com/w40/${countryCode}.png`;
  }

  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    // Fallback a emoji si la imagen no carga
    const countryCode = img.getAttribute('data-country') || '';
    const lang = this.languages.find(l => l.countryCode === countryCode);
    if (lang) {
      // Reemplazar la imagen con el emoji
      img.style.display = 'none';
      const parent = img.parentElement;
      if (parent) {
        const existingEmoji = parent.querySelector('.flag-emoji');
        if (!existingEmoji) {
          const emoji = document.createElement('span');
          emoji.className = 'flag-emoji text-xl leading-none';
          emoji.textContent = lang.flag;
          parent.insertBefore(emoji, img);
        }
      }
    }
  }
}

