import { Component, Output, EventEmitter, OnInit, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { LanguageSelectorComponent } from '../../../../core/components/language-selector/language-selector.component';
import { TranslationService } from '../../../../core/services/translation.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

interface Task {
  _id: string;
  taskId?: string;
  title: string;
  boardId?: string | { _id: string; name: string };
  columnId?: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, LanguageSelectorComponent, FormsModule, RouterLink],
  templateUrl: './navbar.component.html'
})
export class NavbarComponent implements OnInit {
  @Output() toggleSidebar = new EventEmitter<void>();
  @ViewChild('userMenuButton', { static: false }) userMenuButton!: ElementRef;
  @ViewChild('userMenuDropdown', { static: false }) userMenuDropdown!: ElementRef;
  currentUser = this.authService.currentUser;
  searchTerm = '';
  searchResults: Task[] = [];
  showSearchResults = false;
  searching = false;
  preventBlur = false;
  showUserMenu = false;
  private searchSubject = new Subject<string>();
  private apiUrl = environment.apiUrl;

  get userInitials(): string {
    if (this.currentUser) {
      return `${this.currentUser.firstName[0]}${this.currentUser.lastName[0]}`.toUpperCase();
    }
    return 'U';
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    public translationService: TranslationService,
    private http: HttpClient
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  ngOnInit(): void {
    // Configurar debounce para la búsqueda
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      if (searchTerm && searchTerm.trim().length >= 2) {
        this.performSearch(searchTerm.trim());
      } else {
        this.searchResults = [];
        this.searching = false;
      }
    });
  }

  onSearch(): void {
    this.searching = true;
    this.searchSubject.next(this.searchTerm);
  }

  performSearch(term: string): void {
    // Buscar tareas por título usando el endpoint de tasks
    this.http.get<Task[]>(`${this.apiUrl}/tasks`, {
      params: { title: term }
    }).subscribe({
      next: (tasks) => {
        this.searchResults = tasks.slice(0, 10); // Limitar a 10 resultados
        this.searching = false;
      },
      error: (err) => {
        console.error('Error searching tasks', err);
        this.searchResults = [];
        this.searching = false;
      }
    });
  }

  onSearchBlur(): void {
    // Delay para permitir clicks en los resultados
    setTimeout(() => {
      if (!this.preventBlur) {
        this.showSearchResults = false;
      }
    }, 200);
  }

  getBoardName(boardId: string | { _id: string; name: string }): string {
    if (typeof boardId === 'object' && boardId.name) {
      return boardId.name;
    }
    return typeof boardId === 'string' ? boardId : '';
  }

  getBoardInitials(boardId: string | { _id: string; name: string } | undefined): string {
    if (!boardId) return '??';
    const boardName = this.getBoardName(boardId);
    if (!boardName || boardName.length === 0) return '??';
    // Obtener las primeras 2 letras del nombre del tablero
    const words = boardName.trim().split(/\s+/);
    if (words.length >= 2) {
      // Si hay 2 o más palabras, usar la primera letra de cada una
      return (words[0][0] + words[1][0]).toUpperCase();
    } else {
      // Si solo hay una palabra, usar las primeras 2 letras
      return boardName.substring(0, 2).toUpperCase();
    }
  }

  navigateToTask(task: Task): void {
    // Obtener el boardId de la tarea
    let boardId = typeof task.boardId === 'object' ? task.boardId._id : task.boardId;
    
    if (!boardId) {
      // Si no tiene boardId, buscar el board desde la tarea completa
      this.http.get<any>(`${this.apiUrl}/tasks/${task._id}`).subscribe({
        next: (fullTask) => {
          boardId = typeof fullTask.boardId === 'object' 
            ? fullTask.boardId._id 
            : fullTask.boardId;
          if (boardId) {
            this.navigateToBoardWithTask(boardId, task._id);
          }
        },
        error: (err) => {
          console.error('Error loading task', err);
        }
      });
    } else {
      this.navigateToBoardWithTask(boardId, task._id);
    }
  }

  private navigateToBoardWithTask(boardId: string, taskId: string): void {
    // Navegar al tablero con el taskId en query params
    this.router.navigate(['/board', boardId], { 
      queryParams: { taskId: taskId } 
    }).then(() => {
      // Limpiar el buscador después de navegar
      this.searchTerm = '';
      this.searchResults = [];
      this.showSearchResults = false;
    });
  }

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showUserMenu) {
      const target = event.target as HTMLElement;
      const button = this.userMenuButton?.nativeElement;
      const dropdown = this.userMenuDropdown?.nativeElement;
      
      if (button && dropdown && !button.contains(target) && !dropdown.contains(target)) {
        this.closeUserMenu();
      }
    }
  }

  logout(): void {
    this.showUserMenu = false;
    this.authService.logout();
  }
}

