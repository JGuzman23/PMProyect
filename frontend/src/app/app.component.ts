import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslationService } from './core/services/translation.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  title = 'SingOps';

  constructor(private translationService: TranslationService) {}

  ngOnInit(): void {
    // Establecer el idioma del documento HTML basado en el idioma actual
    this.translationService.getCurrentLanguage().subscribe(lang => {
      document.documentElement.lang = lang;
    });
  }
}

