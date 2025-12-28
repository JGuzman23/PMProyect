import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type Language = 'es' | 'en' | 'fr' | 'de' | 'pt' | 'it';

interface Translations {
  [key: string]: string | Translations;
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private currentLanguage$ = new BehaviorSubject<Language>('es');
  private translations: { [lang: string]: Translations } = {};

  constructor() {
    this.loadTranslations();
    // Cargar idioma guardado en localStorage
    const savedLang = localStorage.getItem('language') as Language;
    if (savedLang && this.isValidLanguage(savedLang)) {
      this.setLanguage(savedLang);
    }
  }

  private isValidLanguage(lang: string): lang is Language {
    return ['es', 'en', 'fr', 'de', 'pt', 'it'].includes(lang);
  }

  getCurrentLanguage(): Observable<Language> {
    return this.currentLanguage$.asObservable();
  }

  getCurrentLanguageValue(): Language {
    return this.currentLanguage$.value;
  }

  setLanguage(lang: Language): void {
    this.currentLanguage$.next(lang);
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
  }

  translate(key: string, params?: { [key: string]: string }): string {
    const lang = this.currentLanguage$.value;
    const translation = this.getNestedTranslation(this.translations[lang] || {}, key);
    
    if (!translation) {
      // Fallback a español si no existe la traducción
      const fallback = this.getNestedTranslation(this.translations['es'] || {}, key);
      if (!fallback) {
        console.warn(`Translation missing for key: ${key}`);
        return key;
      }
      return this.replaceParams(fallback, params);
    }

    return this.replaceParams(translation, params);
  }

  private getNestedTranslation(obj: Translations, key: string): string | null {
    const keys = key.split('.');
    let current: any = obj;
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return null;
      }
    }
    
    return typeof current === 'string' ? current : null;
  }

  private replaceParams(text: string, params?: { [key: string]: string }): string {
    if (!params) return text;
    
    let result = text;
    for (const [key, value] of Object.entries(params)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }

  private loadTranslations(): void {
    // Español
    this.translations['es'] = {
      common: {
        save: 'Guardar',
        cancel: 'Cancelar',
        delete: 'Eliminar',
        edit: 'Editar',
        create: 'Crear',
        new: 'Nuevo',
        loading: 'Cargando...',
        close: 'Cerrar',
        back: 'Volver',
        next: 'Siguiente',
        previous: 'Anterior',
        search: 'Buscar',
        filter: 'Filtrar',
        actions: 'Acciones',
        active: 'Activo',
        inactive: 'Inactivo',
        yes: 'Sí',
        no: 'No',
        confirm: 'Confirmar',
        all: 'Todos',
        clear: 'Limpiar',
        menu: 'Menú',
        noResults: 'No se encontraron resultados'
      },
      footer: {
        createdBy: 'Creado por',
        rightsReserved: 'Derechos reservados a'
      },
      auth: {
        login: 'Iniciar sesión',
        logout: 'Cerrar sesión',
        register: 'Registrarse',
        email: 'Correo electrónico',
        password: 'Contraseña',
        forgotPassword: '¿Olvidaste tu contraseña?',
        welcomeBack: 'Bienvenido de nuevo',
        loginToContinue: 'Inicia sesión para continuar',
        noAccount: '¿No tienes cuenta?',
        registerHere: 'Regístrate aquí',
        loginError: 'Error al iniciar sesión'
      },
      sidebar: {
        projects: 'Proyectos',
        boards: 'Tableros',
        calendar: 'Calendario',
        clients: 'Clientes',
        teams: 'Equipos',
        administration: 'Administración',
        boardStatuses: 'Estados del Tablero'
      },
      clients: {
        title: 'Clientes',
        newClient: 'Nuevo Cliente',
        editClient: 'Editar Cliente',
        clientType: 'Tipo de Cliente',
        person: 'Persona',
        company: 'Empresa',
        name: 'Nombre',
        lastName: 'Apellidos',
        companyName: 'Nombre de la Empresa',
        taxId: 'NIF/CIF',
        website: 'Sitio Web',
        agents: 'Agentes (PMs) Asignados',
        addAgent: 'Agregar Agente',
        agent: 'Agente',
        documentType: 'Tipo de Documento',
        documentNumber: 'Número de Documento',
        dni: 'DNI',
        nie: 'NIE',
        passport: 'Pasaporte',
        other: 'Otro',
        address: 'Dirección',
        street: 'Calle',
        city: 'Ciudad',
        state: 'Provincia/Estado',
        zip: 'Código Postal',
        country: 'País',
        notes: 'Notas',
        basicData: 'Tipo y Datos Básicos',
        contactInfo: 'Información de Contacto',
        documents: 'Documentos',
        additionalNotes: 'Notas Adicionales'
      },
      tasks: {
        title: 'Título',
        description: 'Descripción',
        priority: 'Prioridad',
        low: 'Baja',
        medium: 'Media',
        high: 'Alta',
        urgent: 'Urgente',
        dueDate: 'Fecha de fin',
        assignTo: 'Asignar a',
        client: 'Cliente',
        agent: 'Agente',
        selectClient: 'Seleccionar cliente...',
        selectAgent: 'Seleccionar agente...',
        newTask: 'Nueva Tarea',
        editTask: 'Editar Tarea',
        taskDetails: 'Detalles de la Tarea',
        noClient: 'Sin cliente asignado',
        noAgent: 'Sin agente asignado',
        attachments: 'Adjuntos',
        comments: 'Comentarios',
        noComments: 'No hay comentarios aún',
        addComment: 'Agregar comentario',
        assignedTo: 'Asignado a',
        noAssignee: 'Sin asignar',
        noDueDate: 'Sin fecha límite',
        noDescription: 'Sin descripción',
        noAttachments: 'Sin adjuntos',
        attachmentsByStatus: 'Adjuntos por Estado',
        commentsAndActivities: 'Comentarios y Actividades',
        noCommentsOrActivities: 'No hay comentarios ni actividades aún',
        deleteTask: 'Eliminar tarea',
        moreOptions: 'Más opciones',
        close: 'Cerrar',
        save: 'Guardar',
        cancel: 'Cancelar',
        addTask: 'Agregar tarea',
        taskCreated: 'Tarea creada',
        statusChanged: 'Estado cambiado',
        priorityChanged: 'Prioridad cambiada',
        assigneesModified: 'Asignados modificados',
        clientModified: 'Cliente modificado',
        dueDateModified: 'Fecha de fin modificada',
        descriptionModified: 'Descripción modificada',
        commentAdded: 'Comentario agregado',
        attachmentAdded: 'Archivo adjunto agregado',
        attachmentRemoved: 'Archivo adjunto eliminado',
        selectStatus: 'Selecciona un estado',
        attachmentTitle: 'Título del Adjunto',
        upload: 'Subir',
        remove: 'Eliminar',
        download: 'Descargar',
        ago: 'Hace',
        moment: 'un momento',
        minutes: 'minuto',
        minutesPlural: 'minutos',
        hours: 'hora',
        hoursPlural: 'horas',
        days: 'día',
        daysPlural: 'días',
        agentLabel: 'Agente(s)',
        mustSelectStatus: 'Debe seleccionar un estado para el adjunto',
        mustEnterTitle: 'Debe ingresar un título para el adjunto',
        errorAddingComment: 'Error al agregar el comentario. Por favor, intenta de nuevo.',
        errorDeletingFile: 'Error al eliminar el archivo. Por favor, intente nuevamente.',
        errorUploadingFile: 'Error al subir el archivo. Por favor, intente nuevamente.',
        confirmDeleteTask: '¿Estás seguro de eliminar esta tarea?',
        mustSelectAgent: 'Debe seleccionar al menos un agente para clientes tipo empresa',
        usersSelected: 'usuarios seleccionados',
        from: 'de',
        to: 'a',
        titleChanged: 'Título cambiado',
        uploadFileFor: 'Subir archivo para',
        leaveCommentHere: 'Deja tu comentario aquí...'
      },
      boards: {
        newBoard: 'Nuevo Tablero',
        createNewBoard: 'Crear Nuevo Tablero',
        noBoardsYet: 'No hay tableros creados aún',
        createFirstBoard: 'Crear tu primer tablero',
        noDescription: 'Sin descripción',
        active: 'Activo',
        archived: 'Archivado',
        project: 'Proyecto',
        selectProject: 'Selecciona un proyecto',
        noProjectsAvailable: 'No hay proyectos disponibles. Crea un proyecto primero.',
        loadingProjects: 'Cargando proyectos...',
        name: 'Nombre',
        boardNamePlaceholder: 'Nombre del tablero',
        description: 'Descripción',
        boardDescriptionPlaceholder: 'Descripción del tablero',
        create: 'Crear',
        cancel: 'Cancelar',
        backToBoards: 'Volver a tableros',
        couldNotLoadBoard: 'No se pudo cargar el tablero.',
        noColumnsInBoard: 'No hay columnas en este tablero.',
        boardNameRequired: 'El nombre del tablero es requerido',
        mustSelectProject: 'Debes seleccionar un proyecto',
        errorCreatingBoard: 'Error al crear el tablero',
        taskPrefix: 'Prefijo de ID de Tareas',
        taskPrefixHint: 'Ej: PROJ, TASK, DEV',
        taskPrefixPlaceholder: 'PROJ',
        taskPrefixDescription: 'Este prefijo se usará para generar IDs automáticos de tareas (ej: PROJ-001, PROJ-002)'
      },
      admin: {
        projects: 'Proyectos',
        boardStatuses: 'Estados del Tablero',
        teams: 'Equipos',
        selectProject: 'Seleccionar un proyecto',
        newStatus: 'Nuevo Estado',
        editStatus: 'Editar Estado',
        statusName: 'Nombre',
        statusColor: 'Color',
        defaultStatus: 'Estado por defecto',
        selectProjectToView: 'Selecciona un proyecto para ver o crear estados del tablero',
        noStatuses: 'No hay estados creados para este proyecto',
        statusNameRequired: 'El nombre del estado es requerido',
        cannotIdentifyStatus: 'Error: No se puede identificar el estado',
        cannotIdentifyProject: 'Error: No se puede identificar el proyecto',
        errorUpdatingStatus: 'Error al actualizar el estado'
      }
    };

    // Inglés
    this.translations['en'] = {
      common: {
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        create: 'Create',
        new: 'New',
        loading: 'Loading...',
        close: 'Close',
        back: 'Back',
        next: 'Next',
        previous: 'Previous',
        search: 'Search',
        filter: 'Filter',
        noResults: 'No results found',
        actions: 'Actions',
        active: 'Active',
        inactive: 'Inactive',
        yes: 'Yes',
        no: 'No',
        confirm: 'Confirm'
      },
      footer: {
        createdBy: 'Created by',
        rightsReserved: 'All rights reserved to'
      },
      auth: {
        login: 'Sign in',
        logout: 'Sign out',
        register: 'Sign up',
        email: 'Email',
        password: 'Password',
        forgotPassword: 'Forgot your password?',
        welcomeBack: 'Welcome back',
        loginToContinue: 'Sign in to continue',
        noAccount: "Don't have an account?",
        registerHere: 'Sign up here',
        loginError: 'Error signing in'
      },
      sidebar: {
        projects: 'Projects',
        boards: 'Boards',
        calendar: 'Calendar',
        clients: 'Clients',
        teams: 'Teams',
        administration: 'Administration',
        boardStatuses: 'Board Statuses'
      },
      clients: {
        title: 'Clients',
        newClient: 'New Client',
        editClient: 'Edit Client',
        clientType: 'Client Type',
        person: 'Person',
        company: 'Company',
        name: 'Name',
        lastName: 'Last Name',
        companyName: 'Company Name',
        taxId: 'Tax ID',
        website: 'Website',
        agents: 'Assigned Agents (PMs)',
        addAgent: 'Add Agent',
        agent: 'Agent',
        documentType: 'Document Type',
        documentNumber: 'Document Number',
        dni: 'ID Card',
        nie: 'NIE',
        passport: 'Passport',
        other: 'Other',
        address: 'Address',
        street: 'Street',
        city: 'City',
        state: 'State/Province',
        zip: 'Postal Code',
        country: 'Country',
        notes: 'Notes',
        basicData: 'Type and Basic Data',
        contactInfo: 'Contact Information',
        documents: 'Documents',
        additionalNotes: 'Additional Notes'
      },
      tasks: {
        title: 'Title',
        description: 'Description',
        priority: 'Priority',
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        urgent: 'Urgent',
        dueDate: 'Due Date',
        assignTo: 'Assign to',
        client: 'Client',
        agent: 'Agent',
        selectClient: 'Select client...',
        selectAgent: 'Select agent...',
        newTask: 'New Task',
        editTask: 'Edit Task',
        taskDetails: 'Task Details',
        noClient: 'No client assigned',
        noAgent: 'No agent assigned',
        attachments: 'Attachments',
        comments: 'Comments',
        noComments: 'No comments yet',
        addComment: 'Add comment',
        assignedTo: 'Assigned to',
        noAssignee: 'Unassigned',
        noDueDate: 'No due date',
        noDescription: 'No description',
        noAttachments: 'No attachments',
        attachmentsByStatus: 'Attachments by Status',
        commentsAndActivities: 'Comments and Activities',
        noCommentsOrActivities: 'No comments or activities yet',
        deleteTask: 'Delete task',
        moreOptions: 'More options',
        close: 'Close',
        save: 'Save',
        cancel: 'Cancel',
        addTask: 'Add task',
        taskCreated: 'Task created',
        statusChanged: 'Status changed',
        priorityChanged: 'Priority changed',
        assigneesModified: 'Assignees modified',
        clientModified: 'Client modified',
        dueDateModified: 'Due date modified',
        descriptionModified: 'Description modified',
        commentAdded: 'Comment added',
        attachmentAdded: 'Attachment added',
        attachmentRemoved: 'Attachment removed',
        selectStatus: 'Select a status',
        attachmentTitle: 'Attachment Title',
        upload: 'Upload',
        remove: 'Remove',
        download: 'Download',
        ago: 'ago',
        moment: 'a moment',
        minutes: 'minute',
        minutesPlural: 'minutes',
        hours: 'hour',
        hoursPlural: 'hours',
        days: 'day',
        daysPlural: 'days',
        agentLabel: 'Agent(s)',
        mustSelectStatus: 'You must select a status for the attachment',
        mustEnterTitle: 'You must enter a title for the attachment',
        errorAddingComment: 'Error adding comment. Please try again.',
        errorDeletingFile: 'Error deleting file. Please try again.',
        confirmDeleteTask: 'Are you sure you want to delete this task?',
        mustSelectAgent: 'You must select at least one agent for company type clients',
        usersSelected: 'users selected',
        from: 'from',
        to: 'to',
        titleChanged: 'Title changed',
        uploadFileFor: 'Upload file for',
        leaveCommentHere: 'Leave your comment here...'
      },
      boards: {
        newBoard: 'New Board',
        createNewBoard: 'Create New Board',
        noBoardsYet: 'No boards created yet',
        createFirstBoard: 'Create your first board',
        noDescription: 'No description',
        active: 'Active',
        archived: 'Archived',
        project: 'Project',
        selectProject: 'Select a project',
        noProjectsAvailable: 'No projects available. Create a project first.',
        loadingProjects: 'Loading projects...',
        name: 'Name',
        boardNamePlaceholder: 'Board name',
        description: 'Description',
        boardDescriptionPlaceholder: 'Board description',
        create: 'Create',
        cancel: 'Cancel',
        backToBoards: 'Back to boards',
        couldNotLoadBoard: 'Could not load board.',
        noColumnsInBoard: 'No columns in this board.',
        boardNameRequired: 'Board name is required',
        mustSelectProject: 'You must select a project',
        errorCreatingBoard: 'Error creating board',
        taskPrefix: 'Task ID Prefix',
        taskPrefixHint: 'E.g: PROJ, TASK, DEV',
        taskPrefixPlaceholder: 'PROJ',
        taskPrefixDescription: 'This prefix will be used to generate automatic task IDs (e.g: PROJ-001, PROJ-002)'
      },
      admin: {
        projects: 'Projects',
        boardStatuses: 'Board Statuses',
        teams: 'Teams',
        selectProject: 'Select a project',
        newStatus: 'New Status',
        editStatus: 'Edit Status',
        statusName: 'Name',
        statusColor: 'Color',
        defaultStatus: 'Default status',
        selectProjectToView: 'Select a project to view or create board statuses',
        noStatuses: 'No statuses created for this project',
        statusNameRequired: 'Status name is required',
        cannotIdentifyStatus: 'Error: Cannot identify the status',
        cannotIdentifyProject: 'Error: Cannot identify the project',
        errorUpdatingStatus: 'Error updating status'
      }
    };

    // Francés
    this.translations['fr'] = {
      common: {
        save: 'Enregistrer',
        cancel: 'Annuler',
        delete: 'Supprimer',
        edit: 'Modifier',
        create: 'Créer',
        new: 'Nouveau',
        loading: 'Chargement...',
        close: 'Fermer',
        back: 'Retour',
        next: 'Suivant',
        previous: 'Précédent',
        search: 'Rechercher',
        filter: 'Filtrer',
        noResults: 'Aucun résultat trouvé',
        actions: 'Actions',
        active: 'Actif',
        inactive: 'Inactif',
        yes: 'Oui',
        no: 'Non',
        confirm: 'Confirmer'
      },
      footer: {
        createdBy: 'Créé par',
        rightsReserved: 'Tous droits réservés à'
      },
      auth: {
        login: 'Se connecter',
        logout: 'Se déconnecter',
        register: "S'inscrire",
        email: 'E-mail',
        password: 'Mot de passe',
        forgotPassword: 'Mot de passe oublié?',
        welcomeBack: 'Bon retour',
        loginToContinue: 'Connectez-vous pour continuer',
        noAccount: "Vous n'avez pas de compte?",
        registerHere: 'Inscrivez-vous ici',
        loginError: 'Erreur de connexion'
      },
      sidebar: {
        projects: 'Projets',
        boards: 'Tableaux',
        calendar: 'Calendrier',
        clients: 'Clients',
        teams: 'Équipes',
        administration: 'Administration',
        boardStatuses: 'Statuts du Tableau'
      },
      clients: {
        title: 'Clients',
        newClient: 'Nouveau Client',
        editClient: 'Modifier le Client',
        clientType: 'Type de Client',
        person: 'Personne',
        company: 'Entreprise',
        name: 'Nom',
        lastName: 'Nom de famille',
        companyName: 'Nom de l\'Entreprise',
        taxId: 'SIRET',
        website: 'Site Web',
        agents: 'Agents Assignés (PMs)',
        addAgent: 'Ajouter un Agent',
        agent: 'Agent',
        documentType: 'Type de Document',
        documentNumber: 'Numéro de Document',
        dni: 'Carte d\'Identité',
        nie: 'NIE',
        passport: 'Passeport',
        other: 'Autre',
        address: 'Adresse',
        street: 'Rue',
        city: 'Ville',
        state: 'État/Province',
        zip: 'Code Postal',
        country: 'Pays',
        notes: 'Notes',
        basicData: 'Type et Données de Base',
        contactInfo: 'Informations de Contact',
        documents: 'Documents',
        additionalNotes: 'Notes Supplémentaires'
      },
      tasks: {
        title: 'Titre',
        description: 'Description',
        priority: 'Priorité',
        low: 'Basse',
        medium: 'Moyenne',
        high: 'Haute',
        urgent: 'Urgente',
        dueDate: 'Date d\'échéance',
        assignTo: 'Assigner à',
        client: 'Client',
        agent: 'Agent',
        selectClient: 'Sélectionner un client...',
        selectAgent: 'Sélectionner un agent...',
        newTask: 'Nouvelle Tâche',
        editTask: 'Modifier la Tâche',
        taskDetails: 'Détails de la Tâche',
        noClient: 'Aucun client assigné',
        noAgent: 'Aucun agent assigné',
        attachments: 'Pièces jointes',
        comments: 'Commentaires',
        noComments: 'Pas encore de commentaires',
        addComment: 'Ajouter un commentaire'
      },
      admin: {
        projects: 'Projets',
        boardStatuses: 'Statuts du Tableau',
        teams: 'Équipes',
        selectProject: 'Sélectionner un projet',
        newStatus: 'Nouveau Statut',
        editStatus: 'Modifier le Statut',
        statusName: 'Nom',
        statusColor: 'Couleur',
        defaultStatus: 'Statut par défaut',
        selectProjectToView: 'Sélectionnez un projet pour voir ou créer des statuts de tableau',
        noStatuses: 'Aucun statut créé pour ce projet',
        statusNameRequired: 'Le nom du statut est requis',
        cannotIdentifyStatus: 'Erreur: Impossible d\'identifier le statut',
        cannotIdentifyProject: 'Erreur: Impossible d\'identifier le projet',
        errorUpdatingStatus: 'Erreur lors de la mise à jour du statut'
      }
    };

    // Alemán
    this.translations['de'] = {
      common: {
        save: 'Speichern',
        cancel: 'Abbrechen',
        delete: 'Löschen',
        edit: 'Bearbeiten',
        create: 'Erstellen',
        new: 'Neu',
        loading: 'Lädt...',
        close: 'Schließen',
        back: 'Zurück',
        next: 'Weiter',
        previous: 'Zurück',
        search: 'Suchen',
        filter: 'Filtern',
        noResults: 'Keine Ergebnisse gefunden',
        actions: 'Aktionen',
        active: 'Aktiv',
        inactive: 'Inaktiv',
        yes: 'Ja',
        no: 'Nein',
        confirm: 'Bestätigen'
      },
      footer: {
        createdBy: 'Erstellt von',
        rightsReserved: 'Alle Rechte vorbehalten an'
      },
      auth: {
        login: 'Anmelden',
        logout: 'Abmelden',
        register: 'Registrieren',
        email: 'E-Mail',
        password: 'Passwort',
        forgotPassword: 'Passwort vergessen?',
        welcomeBack: 'Willkommen zurück',
        loginToContinue: 'Melden Sie sich an, um fortzufahren',
        noAccount: 'Haben Sie kein Konto?',
        registerHere: 'Hier registrieren',
        loginError: 'Fehler beim Anmelden'
      },
      sidebar: {
        projects: 'Projekte',
        boards: 'Boards',
        calendar: 'Kalender',
        clients: 'Kunden',
        teams: 'Teams',
        administration: 'Verwaltung',
        boardStatuses: 'Board-Status'
      },
      clients: {
        title: 'Kunden',
        newClient: 'Neuer Kunde',
        editClient: 'Kunde bearbeiten',
        clientType: 'Kundentyp',
        person: 'Person',
        company: 'Unternehmen',
        name: 'Name',
        lastName: 'Nachname',
        companyName: 'Firmenname',
        taxId: 'Steuer-ID',
        website: 'Website',
        agents: 'Zugewiesene Agenten (PMs)',
        addAgent: 'Agent hinzufügen',
        agent: 'Agent',
        documentType: 'Dokumenttyp',
        documentNumber: 'Dokumentnummer',
        dni: 'Ausweis',
        nie: 'NIE',
        passport: 'Reisepass',
        other: 'Andere',
        address: 'Adresse',
        street: 'Straße',
        city: 'Stadt',
        state: 'Bundesland/Provinz',
        zip: 'Postleitzahl',
        country: 'Land',
        notes: 'Notizen',
        basicData: 'Typ und Grunddaten',
        contactInfo: 'Kontaktinformationen',
        documents: 'Dokumente',
        additionalNotes: 'Zusätzliche Notizen'
      },
      tasks: {
        title: 'Titel',
        description: 'Beschreibung',
        priority: 'Priorität',
        low: 'Niedrig',
        medium: 'Mittel',
        high: 'Hoch',
        urgent: 'Dringend',
        dueDate: 'Fälligkeitsdatum',
        assignTo: 'Zuweisen an',
        client: 'Kunde',
        agent: 'Agent',
        selectClient: 'Kunde auswählen...',
        selectAgent: 'Agent auswählen...',
        newTask: 'Neue Aufgabe',
        editTask: 'Aufgabe bearbeiten',
        taskDetails: 'Aufgabendetails',
        noClient: 'Kein Kunde zugewiesen',
        noAgent: 'Kein Agent zugewiesen',
        attachments: 'Anhänge',
        comments: 'Kommentare',
        noComments: 'Noch keine Kommentare',
        addComment: 'Kommentar hinzufügen'
      },
      admin: {
        projects: 'Projekte',
        boardStatuses: 'Board-Status',
        teams: 'Teams',
        selectProject: 'Projekt auswählen',
        newStatus: 'Neuer Status',
        editStatus: 'Status bearbeiten',
        statusName: 'Name',
        statusColor: 'Farbe',
        defaultStatus: 'Standardstatus',
        selectProjectToView: 'Wählen Sie ein Projekt aus, um Board-Status anzuzeigen oder zu erstellen',
        noStatuses: 'Keine Status für dieses Projekt erstellt',
        statusNameRequired: 'Der Statusname ist erforderlich',
        cannotIdentifyStatus: 'Fehler: Status kann nicht identifiziert werden',
        cannotIdentifyProject: 'Fehler: Projekt kann nicht identifiziert werden',
        errorUpdatingStatus: 'Fehler beim Aktualisieren des Status'
      }
    };

    // Portugués
    this.translations['pt'] = {
      common: {
        save: 'Salvar',
        cancel: 'Cancelar',
        delete: 'Excluir',
        edit: 'Editar',
        create: 'Criar',
        new: 'Novo',
        loading: 'Carregando...',
        close: 'Fechar',
        back: 'Voltar',
        next: 'Próximo',
        previous: 'Anterior',
        search: 'Buscar',
        filter: 'Filtrar',
        noResults: 'Nenhum resultado encontrado',
        actions: 'Ações',
        active: 'Ativo',
        inactive: 'Inativo',
        yes: 'Sim',
        no: 'Não',
        confirm: 'Confirmar'
      },
      footer: {
        createdBy: 'Criado por',
        rightsReserved: 'Todos os direitos reservados a'
      },
      auth: {
        login: 'Entrar',
        logout: 'Sair',
        register: 'Registrar',
        email: 'E-mail',
        password: 'Senha',
        forgotPassword: 'Esqueceu sua senha?',
        welcomeBack: 'Bem-vindo de volta',
        loginToContinue: 'Entre para continuar',
        noAccount: 'Não tem uma conta?',
        registerHere: 'Registre-se aqui',
        loginError: 'Erro ao entrar'
      },
      sidebar: {
        projects: 'Projetos',
        boards: 'Quadros',
        calendar: 'Calendário',
        clients: 'Clientes',
        teams: 'Equipes',
        administration: 'Administração',
        boardStatuses: 'Status do Quadro'
      },
      clients: {
        title: 'Clientes',
        newClient: 'Novo Cliente',
        editClient: 'Editar Cliente',
        clientType: 'Tipo de Cliente',
        person: 'Pessoa',
        company: 'Empresa',
        name: 'Nome',
        lastName: 'Sobrenome',
        companyName: 'Nome da Empresa',
        taxId: 'CNPJ',
        website: 'Site',
        agents: 'Agentes Atribuídos (PMs)',
        addAgent: 'Adicionar Agente',
        agent: 'Agente',
        documentType: 'Tipo de Documento',
        documentNumber: 'Número do Documento',
        dni: 'RG',
        nie: 'NIE',
        passport: 'Passaporte',
        other: 'Outro',
        address: 'Endereço',
        street: 'Rua',
        city: 'Cidade',
        state: 'Estado/Província',
        zip: 'CEP',
        country: 'País',
        notes: 'Notas',
        basicData: 'Tipo e Dados Básicos',
        contactInfo: 'Informações de Contato',
        documents: 'Documentos',
        additionalNotes: 'Notas Adicionais'
      },
      tasks: {
        title: 'Título',
        description: 'Descrição',
        priority: 'Prioridade',
        low: 'Baixa',
        medium: 'Média',
        high: 'Alta',
        urgent: 'Urgente',
        dueDate: 'Data de Vencimento',
        assignTo: 'Atribuir a',
        client: 'Cliente',
        agent: 'Agente',
        selectClient: 'Selecionar cliente...',
        selectAgent: 'Selecionar agente...',
        newTask: 'Nova Tarefa',
        editTask: 'Editar Tarefa',
        taskDetails: 'Detalhes da Tarefa',
        noClient: 'Nenhum cliente atribuído',
        noAgent: 'Nenhum agente atribuído',
        attachments: 'Anexos',
        comments: 'Comentários',
        noComments: 'Ainda não há comentários',
        addComment: 'Adicionar comentário'
      },
      admin: {
        projects: 'Projetos',
        boardStatuses: 'Status do Quadro',
        teams: 'Equipes',
        selectProject: 'Selecionar um projeto',
        newStatus: 'Novo Status',
        editStatus: 'Editar Status',
        statusName: 'Nome',
        statusColor: 'Cor',
        defaultStatus: 'Status padrão',
        selectProjectToView: 'Selecione um projeto para ver ou criar status do quadro',
        noStatuses: 'Nenhum status criado para este projeto',
        statusNameRequired: 'O nome do status é obrigatório',
        cannotIdentifyStatus: 'Erro: Não é possível identificar o status',
        cannotIdentifyProject: 'Erro: Não é possível identificar o projeto',
        errorUpdatingStatus: 'Erro ao atualizar o status'
      }
    };

    // Italiano
    this.translations['it'] = {
      common: {
        save: 'Salva',
        cancel: 'Annulla',
        delete: 'Elimina',
        edit: 'Modifica',
        create: 'Crea',
        new: 'Nuovo',
        loading: 'Caricamento...',
        close: 'Chiudi',
        back: 'Indietro',
        next: 'Successivo',
        previous: 'Precedente',
        search: 'Cerca',
        filter: 'Filtra',
        noResults: 'Nessun risultato trovato',
        actions: 'Azioni',
        active: 'Attivo',
        inactive: 'Inattivo',
        yes: 'Sì',
        no: 'No',
        confirm: 'Conferma'
      },
      footer: {
        createdBy: 'Creato da',
        rightsReserved: 'Tutti i diritti riservati a'
      },
      auth: {
        login: 'Accedi',
        logout: 'Esci',
        register: 'Registrati',
        email: 'E-mail',
        password: 'Password',
        forgotPassword: 'Password dimenticata?',
        welcomeBack: 'Bentornato',
        loginToContinue: 'Accedi per continuare',
        noAccount: 'Non hai un account?',
        registerHere: 'Registrati qui',
        loginError: 'Errore durante l\'accesso'
      },
      sidebar: {
        projects: 'Progetti',
        boards: 'Bacheche',
        calendar: 'Calendario',
        clients: 'Clienti',
        teams: 'Squadre',
        administration: 'Amministrazione',
        boardStatuses: 'Stati della Bacheca'
      },
      clients: {
        title: 'Clienti',
        newClient: 'Nuovo Cliente',
        editClient: 'Modifica Cliente',
        clientType: 'Tipo di Cliente',
        person: 'Persona',
        company: 'Azienda',
        name: 'Nome',
        lastName: 'Cognome',
        companyName: 'Nome Azienda',
        taxId: 'Partita IVA',
        website: 'Sito Web',
        agents: 'Agenti Assegnati (PMs)',
        addAgent: 'Aggiungi Agente',
        agent: 'Agente',
        documentType: 'Tipo di Documento',
        documentNumber: 'Numero Documento',
        dni: 'Carta d\'Identità',
        nie: 'NIE',
        passport: 'Passaporto',
        other: 'Altro',
        address: 'Indirizzo',
        street: 'Via',
        city: 'Città',
        state: 'Stato/Provincia',
        zip: 'CAP',
        country: 'Paese',
        notes: 'Note',
        basicData: 'Tipo e Dati di Base',
        contactInfo: 'Informazioni di Contatto',
        documents: 'Documenti',
        additionalNotes: 'Note Aggiuntive'
      },
      tasks: {
        title: 'Titolo',
        description: 'Descrizione',
        priority: 'Priorità',
        low: 'Bassa',
        medium: 'Media',
        high: 'Alta',
        urgent: 'Urgente',
        dueDate: 'Data di Scadenza',
        assignTo: 'Assegna a',
        client: 'Cliente',
        agent: 'Agente',
        selectClient: 'Seleziona cliente...',
        selectAgent: 'Seleziona agente...',
        newTask: 'Nuova Attività',
        editTask: 'Modifica Attività',
        taskDetails: 'Dettagli Attività',
        noClient: 'Nessun cliente assegnato',
        noAgent: 'Nessun agente assegnato',
        attachments: 'Allegati',
        comments: 'Commenti',
        noComments: 'Ancora nessun commento',
        addComment: 'Aggiungi commento'
      },
      admin: {
        projects: 'Progetti',
        boardStatuses: 'Stati della Bacheca',
        teams: 'Squadre',
        selectProject: 'Seleziona un progetto',
        newStatus: 'Nuovo Stato',
        editStatus: 'Modifica Stato',
        statusName: 'Nome',
        statusColor: 'Colore',
        defaultStatus: 'Stato predefinito',
        selectProjectToView: 'Seleziona un progetto per visualizzare o creare stati della bacheca',
        noStatuses: 'Nessuno stato creato per questo progetto',
        statusNameRequired: 'Il nome dello stato è obbligatorio',
        cannotIdentifyStatus: 'Errore: Impossibile identificare lo stato',
        cannotIdentifyProject: 'Errore: Impossibile identificare il progetto',
        errorUpdatingStatus: 'Errore durante l\'aggiornamento dello stato'
      }
    };
  }
}

