import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

interface Board {
  _id: string;
  name: string;
  description: string;
  projectId: {
    _id: string;
    name: string;
  };
  status: string;
}

interface Project {
  _id: string;
  name: string;
  description: string;
}

@Component({
  selector: 'app-board-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './board-list.component.html'
})
export class BoardListComponent implements OnInit {
  boards: Board[] = [];
  projects: Project[] = [];
  loading = true;
  loadingProjects = false;
  showCreateModal = false;
  error = '';
  newBoard = {
    name: '',
    description: '',
    projectId: ''
  };

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadBoards();
    this.loadProjects();
  }

  loadBoards(): void {
    this.loading = true;
    this.http.get<Board[]>(`${this.apiUrl}/boards`).subscribe({
      next: (boards) => {
        this.boards = boards;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading boards', err);
        this.loading = false;
      }
    });
  }

  loadProjects(): void {
    this.loadingProjects = true;
    this.http.get<Project[]>(`${this.apiUrl}/projects`).subscribe({
      next: (projects) => {
        this.projects = projects;
        this.loadingProjects = false;
        // Si hay proyectos y no hay uno seleccionado, seleccionar el primero
        if (projects.length > 0 && !this.newBoard.projectId) {
          this.newBoard.projectId = projects[0]._id;
        }
      },
      error: (err) => {
        console.error('Error loading projects', err);
        this.loadingProjects = false;
      }
    });
  }

  openCreateModal(): void {
    this.showCreateModal = true;
    this.error = '';
    // Recargar proyectos al abrir el modal
    this.loadProjects();
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.newBoard = { name: '', description: '', projectId: '' };
    this.error = '';
  }

  createBoard(): void {
    if (!this.newBoard.name) {
      this.error = 'El nombre del tablero es requerido';
      return;
    }

    if (!this.newBoard.projectId) {
      this.error = 'Debes seleccionar un proyecto';
      return;
    }

    this.error = '';
    this.http.post(`${this.apiUrl}/boards`, this.newBoard).subscribe({
      next: (board: any) => {
        this.boards.push(board);
        this.closeCreateModal();
        this.router.navigate(['/board', board._id]);
      },
      error: (err) => {
        console.error('Error creating board', err);
        this.error = err.error?.error || err.error?.message || 'Error al crear el tablero';
      }
    });
  }
}

