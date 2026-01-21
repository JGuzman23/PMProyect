import { Component, Output, EventEmitter, OnInit, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { LanguageSelectorComponent } from '../../../../core/components/language-selector/language-selector.component';
import { TranslationService } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
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

interface Note {
  _id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, LanguageSelectorComponent, FormsModule, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
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
  avatarLoadError = false;
  showNotesModal = false;
  notes: Note[] = [];
  notesLoading = false;
  showEditNoteModal = false;
  showCreateNoteSection = false;
  selectedNote: Note | null = null;
  newNoteTitle = '';
  newNoteContent = '';
  noteForm = {
    title: '',
    content: ''
  };
  private searchSubject = new Subject<string>();
  private apiUrl = environment.apiUrl;

  get userInitials(): string {
    if (this.currentUser) {
      return `${this.currentUser.firstName[0]}${this.currentUser.lastName[0]}`.toUpperCase();
    }
    return 'U';
  }

  get avatarUrl(): string | null {
    if (this.avatarLoadError) {
      return null;
    }
    if (this.currentUser?.avatar) {
      const avatarPath = this.currentUser.avatar;
      // If it's already base64 (data URI), return it directly
      if (avatarPath.startsWith('data:image/')) {
        return avatarPath;
      }
      // If it's a full URL, return it
      if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
        return avatarPath;
      }
      // For relative paths, extract filename and use API endpoint
      const filename = avatarPath.split('/').pop();
      if (filename) {
        return `${this.apiUrl}/users/avatar/${filename}`;
      }
    }
    return null;
  }

  onAvatarError(): void {
    this.avatarLoadError = true;
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    public translationService: TranslationService,
    private http: HttpClient
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      // Reset avatar error when user changes
      this.avatarLoadError = false;
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
    
    // Cargar notas para mostrar el contador
    this.loadNotes();
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

  toggleNotesModal(): void {
    this.showNotesModal = !this.showNotesModal;
    if (this.showNotesModal) {
      this.loadNotes();
    }
  }

  closeNotesModal(): void {
    this.showNotesModal = false;
    this.showEditNoteModal = false;
    this.showCreateNoteSection = false;
    this.selectedNote = null;
    this.newNoteTitle = '';
    this.newNoteContent = '';
  }

  toggleCreateNoteSection(): void {
    this.showCreateNoteSection = !this.showCreateNoteSection;
  }

  loadNotes(): void {
    this.notesLoading = true;
    this.http.get<Note[]>(`${this.apiUrl}/notes`).subscribe({
      next: (notes) => {
        this.notes = notes;
        this.notesLoading = false;
      },
      error: (err) => {
        console.error('Error loading notes', err);
        this.notesLoading = false;
      }
    });
  }


  openEditNoteModal(note: Note): void {
    this.selectedNote = note;
    this.noteForm = {
      title: note.title,
      content: note.content
    };
    this.showEditNoteModal = true;
  }

  closeEditNoteModal(): void {
    this.showEditNoteModal = false;
    this.selectedNote = null;
    this.noteForm = { title: '', content: '' };
  }

  createNote(): void {
    if (!this.newNoteTitle.trim()) {
      alert(this.translationService.translate('notes.titleRequired'));
      return;
    }

    const noteData = {
      title: this.newNoteTitle,
      content: this.newNoteContent
    };

    this.http.post<Note>(`${this.apiUrl}/notes`, noteData).subscribe({
      next: (note) => {
        this.notes.unshift(note);
        this.newNoteTitle = '';
        this.newNoteContent = '';
        this.showCreateNoteSection = false;
      },
      error: (err) => {
        console.error('Error creating note', err);
        alert(this.translationService.translate('notes.createError'));
      }
    });
  }

  updateNote(): void {
    if (!this.selectedNote || !this.noteForm.title.trim()) {
      alert(this.translationService.translate('notes.titleRequired'));
      return;
    }

    this.http.put<Note>(`${this.apiUrl}/notes/${this.selectedNote._id}`, this.noteForm).subscribe({
      next: (note) => {
        const index = this.notes.findIndex(n => n._id === note._id);
        if (index !== -1) {
          this.notes[index] = note;
        }
        this.closeEditNoteModal();
      },
      error: (err) => {
        console.error('Error updating note', err);
        alert(this.translationService.translate('notes.updateError'));
      }
    });
  }

  deleteNote(note: Note): void {
    if (!confirm(this.translationService.translate('notes.deleteConfirm'))) {
      return;
    }

    this.http.delete(`${this.apiUrl}/notes/${note._id}`).subscribe({
      next: () => {
        this.notes = this.notes.filter(n => n._id !== note._id);
      },
      error: (err) => {
        console.error('Error deleting note', err);
        alert(this.translationService.translate('notes.deleteError'));
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getStickyNoteClass(index: number): string {
    const colors = [
      'sticky-note-yellow',
      'sticky-note-pink',
      'sticky-note-blue',
      'sticky-note-green',
      'sticky-note-purple',
      'sticky-note-orange'
    ];
    return colors[index % colors.length];
  }
}

