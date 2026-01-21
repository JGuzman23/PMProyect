import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { TranslationService } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { AuthService } from '../../../../core/services/auth.service';

interface Note {
  _id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-notes-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './notes-list.component.html',
  styleUrls: ['./notes-list.component.css']
})
export class NotesListComponent implements OnInit {
  notes: Note[] = [];
  loading = false;
  showCreateModal = false;
  showEditModal = false;
  selectedNote: Note | null = null;
  noteForm = {
    title: '',
    content: ''
  };

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    public translationService: TranslationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadNotes();
  }

  loadNotes(): void {
    this.loading = true;
    this.http.get<Note[]>(`${this.apiUrl}/notes`).subscribe({
      next: (notes) => {
        this.notes = notes;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading notes', err);
        this.loading = false;
      }
    });
  }

  openCreateModal(): void {
    this.noteForm = { title: '', content: '' };
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.noteForm = { title: '', content: '' };
  }

  openEditModal(note: Note): void {
    this.selectedNote = note;
    this.noteForm = {
      title: note.title,
      content: note.content
    };
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedNote = null;
    this.noteForm = { title: '', content: '' };
  }

  createNote(): void {
    if (!this.noteForm.title.trim()) {
      alert(this.translationService.translate('notes.titleRequired'));
      return;
    }

    this.http.post<Note>(`${this.apiUrl}/notes`, this.noteForm).subscribe({
      next: (note) => {
        this.notes.unshift(note);
        this.closeCreateModal();
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
        this.closeEditModal();
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
