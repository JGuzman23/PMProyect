import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { environment } from '../../../../../environments/environment';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { TranslationService } from '../../../../core/services/translation.service';

interface Board {
  _id: string;
  name: string;
  projectId: {
    _id: string;
    name: string;
  };
}

interface BoardStatus {
  _id: string;
  name: string;
  color: string;
  isDefault: boolean;
  order: number;
  boardId: {
    _id: string;
    name: string;
  };
}

@Component({
  selector: 'app-status-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, TranslatePipe],
  templateUrl: './status-admin.component.html'
})
export class StatusAdminComponent implements OnInit {
  statuses: BoardStatus[] = [];
  boards: Board[] = [];
  selectedBoardId: string = '';
  showStatusModal = false;
  selectedStatus: BoardStatus | null = null;
  statusForm = { name: '', color: '#94A3B8', isDefault: false, order: 0, boardId: '' };
  error = '';

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadBoards();
  }

  loadBoards(): void {
    this.http.get<Board[]>(`${this.apiUrl}/boards`).subscribe({
      next: (boards) => {
        this.boards = boards;
        if (boards.length > 0 && !this.selectedBoardId) {
          this.selectedBoardId = boards[0]._id;
          this.loadStatuses();
        }
      },
      error: (err) => console.error('Error loading boards', err)
    });
  }

  onBoardChange(): void {
    this.loadStatuses();
  }

  loadStatuses(): void {
    const url = this.selectedBoardId 
      ? `${this.apiUrl}/admin/statuses?boardId=${this.selectedBoardId}`
      : `${this.apiUrl}/admin/statuses`;
    this.http.get<BoardStatus[]>(url).subscribe({
      next: (statuses) => {
        this.statuses = statuses.sort((a, b) => a.order - b.order);
      },
      error: (err) => console.error('Error loading statuses', err)
    });
  }

  openStatusModal(): void {
    this.selectedStatus = null;
    this.statusForm = { 
      name: '', 
      color: '#94A3B8', 
      isDefault: false, 
      order: this.statuses.length, 
      boardId: this.selectedBoardId || '' 
    };
    this.error = '';
    this.showStatusModal = true;
  }

  editStatus(status: BoardStatus): void {
    this.selectedStatus = status;
    this.statusForm = {
      name: status.name,
      color: status.color,
      isDefault: status.isDefault,
      order: status.order,
      boardId: status.boardId?._id || ''
    };
    this.error = '';
    this.showStatusModal = true;
  }

  closeStatusModal(): void {
    this.showStatusModal = false;
    this.selectedStatus = null;
    this.error = '';
  }

  saveStatus(): void {
    if (!this.statusForm.name) {
      this.error = this.translationService.translate('admin.statusNameRequired');
      return;
    }

    if (!this.statusForm.boardId) {
      this.error = this.translationService.translate('admin.mustSelectBoard');
      return;
    }

    this.error = '';

    if (this.selectedStatus) {
      this.http.put(`${this.apiUrl}/admin/statuses/${this.selectedStatus._id}`, this.statusForm).subscribe({
        next: () => {
          this.loadStatuses();
          this.closeStatusModal();
        },
        error: (err) => {
          console.error('Error updating status', err);
          this.error = err.error?.error || err.error?.message || this.translationService.translate('admin.errorUpdatingStatus');
        }
      });
    } else {
      this.http.post(`${this.apiUrl}/admin/statuses`, this.statusForm).subscribe({
        next: () => {
          this.loadStatuses();
          this.closeStatusModal();
        },
        error: (err) => {
          console.error('Error creating status', err);
          this.error = err.error?.error || err.error?.message || this.translationService.translate('admin.errorCreatingStatus');
        }
      });
    }
  }

  deleteStatus(id: string): void {
    if (confirm(this.translationService.translate('admin.confirmDeleteStatus'))) {
      this.http.delete(`${this.apiUrl}/admin/statuses/${id}`).subscribe({
        next: () => {
          this.loadStatuses();
        },
        error: (err) => console.error('Error deleting status', err)
      });
    }
  }

  dropStatus(event: CdkDragDrop<BoardStatus[]>): void {
    moveItemInArray(this.statuses, event.previousIndex, event.currentIndex);
    
    // Actualizar el orden en el backend
    const statusesToUpdate = this.statuses.map((status, index) => ({
      _id: status._id,
      order: index
    }));

    this.http.put(`${this.apiUrl}/admin/statuses/order`, { statuses: statusesToUpdate }).subscribe({
      next: () => {
        // Actualizar el orden local
        this.statuses.forEach((status, index) => {
          status.order = index;
        });
      },
      error: (err) => {
        console.error('Error updating status order', err);
        // Revertir el cambio en caso de error
        this.loadStatuses();
      }
    });
  }
}




