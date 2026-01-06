import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { TranslationService } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  avatar?: string | null;
  position?: string | null;
}

interface ChartNode {
  id: string;
  name: string;
  role: string;
  position?: string;
  email: string;
  avatar?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  children?: ChartNode[];
}

interface Connection {
  from: string; // node id
  to: string; // node id
  id?: string; // connection id for deletion
}

type ViewMode = 'org' | 'flow';

@Component({
  selector: 'app-team-charts',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './team-charts.component.html',
  styleUrls: ['./team-charts.component.css']
})
export class TeamChartsComponent implements OnInit, AfterViewInit {
  @ViewChild('orgChartSvg', { static: false }) orgChartSvg!: ElementRef<SVGElement>;
  @ViewChild('flowChartSvg', { static: false }) flowChartSvg!: ElementRef<SVGElement>;

  users: User[] = [];
  viewMode: ViewMode = 'org';
  orgNodes: ChartNode[] = [];
  flowNodes: ChartNode[] = [];
  avatarErrors: { [userId: string]: boolean } = {};
  
  // Edit mode state - unified edit mode
  isEditMode: boolean = false;
  editModeType: 'positions' | 'connections' | null = null;
  
  // Computed property for backward compatibility
  get isConnectionEditMode(): boolean {
    return this.isEditMode && this.editModeType === 'connections';
  }
  originalOrgNodes: ChartNode[] = [];
  originalFlowNodes: ChartNode[] = [];
  draggedNode: ChartNode | null = null;
  dragOffset = { x: 0, y: 0 };
  
  // Connection editing state
  customConnections: Connection[] = [];
  originalConnections: Connection[] = [];
  selectedNodeForConnection: string | null = null;
  tempConnectionLine: { from: { x: number; y: number } | null; to: { x: number; y: number } | null } = { from: null, to: null };
  
  // Notification state
  notification: { message: string; type: 'success' | 'error' | 'info' } | null = null;
  
  // Computed properties for template
  get totalMembers(): number {
    return this.users.length;
  }

  get adminCount(): number {
    return this.users.filter(u => u.role === 'admin').length;
  }

  get managerCount(): number {
    return this.users.filter(u => u.role === 'manager').length;
  }
  
  private apiUrl = environment.apiUrl;
  private readonly NODE_WIDTH = 200;
  private readonly NODE_HEIGHT = 120;
  private readonly HORIZONTAL_SPACING = 250;
  private readonly VERTICAL_SPACING = 180;

  constructor(
    private http: HttpClient,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  ngAfterViewInit(): void {
    // Render charts after view initialization
    setTimeout(() => {
      // Load saved connections first
      this.loadSavedConnections();
      this.renderOrgChart();
      this.renderFlowChart();
    }, 100);
  }

  loadUsers(): void {
    this.http.get<User[]>(`${this.apiUrl}/users`).subscribe({
      next: (users) => {
        this.users = users.filter(u => u.isActive);
        this.organizeData();
        // Load saved positions and connections from backend
        this.loadChartSettings();
      },
      error: (err) => {
        console.error('Error loading users', err);
      }
    });
  }

  loadChartSettings(): void {
    this.http.get<any>(`${this.apiUrl}/teams/charts/settings`).subscribe({
      next: (settings) => {
        // Load positions from backend
        if (settings.chartPositions) {
          this.applyPositions(settings.chartPositions);
        }
        
        // Load connections from backend
        if (settings.chartConnections && settings.chartConnections.length > 0) {
          this.customConnections = settings.chartConnections;
        } else {
          // Fallback to localStorage if no backend data
          this.loadSavedConnections();
        }
        
        // Render charts after loading all data
        setTimeout(() => {
          this.renderOrgChart();
          this.renderFlowChart();
        }, 100);
      },
      error: (err) => {
        console.error('Error loading chart settings', err);
        // Fallback to localStorage if backend fails
        setTimeout(() => {
          this.loadSavedPositions();
          this.loadSavedConnections();
          this.renderOrgChart();
          this.renderFlowChart();
        }, 100);
      }
    });
  }

  applyPositions(positions: { orgNodes: any[]; flowNodes: any[] }): void {
    // Apply saved positions to org nodes
    positions.orgNodes?.forEach((savedNode: { id: string; x: number; y: number }) => {
      const node = this.orgNodes.find(n => n.id === savedNode.id);
      if (node) {
        node.x = savedNode.x;
        node.y = savedNode.y;
      }
    });
    
    // Apply saved positions to flow nodes
    positions.flowNodes?.forEach((savedNode: { id: string; x: number; y: number }) => {
      const node = this.flowNodes.find(n => n.id === savedNode.id);
      if (node) {
        node.x = savedNode.x;
        node.y = savedNode.y;
      }
    });
    
    // Update original positions
    this.originalOrgNodes = JSON.parse(JSON.stringify(this.orgNodes));
    this.originalFlowNodes = JSON.parse(JSON.stringify(this.flowNodes));
  }

  organizeData(): void {
    // Organize users by role hierarchy: admin -> manager -> member
    const admins = this.users.filter(u => u.role === 'admin');
    const managers = this.users.filter(u => u.role === 'manager');
    const members = this.users.filter(u => u.role === 'member');

    // Build organizational chart nodes
    this.orgNodes = [];
    let yPosition = 50;
    
    // Save original positions if not in edit mode
    if (!this.isEditMode) {
      this.originalOrgNodes = [];
      this.originalFlowNodes = [];
    }

    // Admins at top
    if (admins.length > 0) {
      admins.forEach((admin, index) => {
        this.orgNodes.push({
          id: admin._id,
          name: `${admin.firstName} ${admin.lastName}`,
          role: admin.role,
          position: admin.position || '',
          email: admin.email,
          avatar: admin.avatar,
          x: this.calculateXPosition(admins.length, index, 0),
          y: yPosition,
          width: this.NODE_WIDTH,
          height: this.NODE_HEIGHT
        });
      });
      yPosition += this.VERTICAL_SPACING;
    }

    // Managers in middle
    if (managers.length > 0) {
      managers.forEach((manager, index) => {
        this.orgNodes.push({
          id: manager._id,
          name: `${manager.firstName} ${manager.lastName}`,
          role: manager.role,
          position: manager.position || '',
          email: manager.email,
          avatar: manager.avatar,
          x: this.calculateXPosition(managers.length, index, 0),
          y: yPosition,
          width: this.NODE_WIDTH,
          height: this.NODE_HEIGHT
        });
      });
      yPosition += this.VERTICAL_SPACING;
    }

    // Members at bottom
    if (members.length > 0) {
      members.forEach((member, index) => {
        this.orgNodes.push({
          id: member._id,
          name: `${member.firstName} ${member.lastName}`,
          role: member.role,
          position: member.position || '',
          email: member.email,
          avatar: member.avatar,
          x: this.calculateXPosition(members.length, index, 0),
          y: yPosition,
          width: this.NODE_WIDTH,
          height: this.NODE_HEIGHT
        });
      });
    }

    // Build flowchart nodes (circular/network layout)
    this.flowNodes = [];
    const totalUsers = this.users.length;
    const centerX = 400;
    const centerY = 300;
    const radius = Math.min(250, Math.max(150, totalUsers * 15));

    this.users.forEach((user, index) => {
      const angle = (2 * Math.PI * index) / totalUsers;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      this.flowNodes.push({
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        position: user.position || '',
        email: user.email,
        avatar: user.avatar,
        x: x,
        y: y,
        width: this.NODE_WIDTH,
        height: this.NODE_HEIGHT
      });
    });
    
    // Save original positions
    if (!this.isEditMode) {
      this.originalOrgNodes = JSON.parse(JSON.stringify(this.orgNodes));
      this.originalFlowNodes = JSON.parse(JSON.stringify(this.flowNodes));
    }
  }

  calculateXPosition(total: number, index: number, level: number): number {
    const totalWidth = total * this.HORIZONTAL_SPACING;
    const startX = (800 - totalWidth) / 2 + this.NODE_WIDTH / 2;
    return startX + index * this.HORIZONTAL_SPACING;
  }

  renderOrgChart(): void {
    if (!this.orgChartSvg || !this.orgNodes.length) return;

    const svg = this.orgChartSvg.nativeElement;
    svg.innerHTML = '';

    // Draw connections - use custom connections if they exist, otherwise use default
    if (this.customConnections.length > 0) {
      // Draw custom connections
      this.customConnections.forEach(conn => {
        const fromNode = this.orgNodes.find(n => n.id === conn.from);
        const toNode = this.orgNodes.find(n => n.id === conn.to);
        if (fromNode && toNode) {
          this.drawConnection(svg, fromNode, toNode, false, conn.id);
        }
      });
    } else {
      // Draw default connections
      const admins = this.orgNodes.filter(n => n.role === 'admin');
      const managers = this.orgNodes.filter(n => n.role === 'manager');
      const members = this.orgNodes.filter(n => n.role === 'member');

      // Connect admins to managers
      if (admins.length > 0 && managers.length > 0) {
        admins.forEach(admin => {
          managers.forEach(manager => {
            this.drawConnection(svg, admin, manager);
          });
        });
      }

      // Connect managers to members
      if (managers.length > 0 && members.length > 0) {
        managers.forEach(manager => {
          members.forEach(member => {
            this.drawConnection(svg, manager, member);
          });
        });
      }

      // If no managers, connect admins directly to members
      if (admins.length > 0 && managers.length === 0 && members.length > 0) {
        admins.forEach(admin => {
          members.forEach(member => {
            this.drawConnection(svg, admin, member);
          });
        });
      }
    }

    // Draw temporary connection line if creating one
    if (this.tempConnectionLine.from && this.tempConnectionLine.to) {
      this.drawTempConnection(svg, this.tempConnectionLine.from, this.tempConnectionLine.to);
    }

    // Draw nodes
    this.orgNodes.forEach(node => {
      this.drawNode(svg, node);
    });
  }

  renderFlowChart(): void {
    if (!this.flowChartSvg || !this.flowNodes.length) return;

    const svg = this.flowChartSvg.nativeElement;
    svg.innerHTML = '';

    // Draw connections - use custom connections if they exist, otherwise use default
    if (this.customConnections.length > 0) {
      // Draw custom connections
      this.customConnections.forEach(conn => {
        const fromNode = this.flowNodes.find(n => n.id === conn.from);
        const toNode = this.flowNodes.find(n => n.id === conn.to);
        if (fromNode && toNode) {
          this.drawConnection(svg, fromNode, toNode, false, conn.id);
        }
      });
    } else {
      // Draw default connections
      for (let i = 0; i < this.flowNodes.length; i++) {
        for (let j = i + 1; j < this.flowNodes.length; j++) {
          const node1 = this.flowNodes[i];
          const node2 = this.flowNodes[j];
          
          // Only connect if roles allow (hierarchical connections)
          if (this.shouldConnect(node1.role, node2.role)) {
            this.drawConnection(svg, node1, node2, true);
          }
        }
      }
    }

    // Draw temporary connection line if creating one
    if (this.tempConnectionLine.from && this.tempConnectionLine.to) {
      this.drawTempConnection(svg, this.tempConnectionLine.from, this.tempConnectionLine.to);
    }

    // Draw nodes
    this.flowNodes.forEach(node => {
      this.drawNode(svg, node);
    });
  }

  shouldConnect(role1: string, role2: string): boolean {
    const hierarchy: { [key: string]: number } = { admin: 3, manager: 2, member: 1 };
    const diff = Math.abs(hierarchy[role1] - hierarchy[role2]);
    // Connect adjacent levels or same level
    return diff <= 1;
  }

  drawConnection(svg: SVGElement, from: ChartNode, to: ChartNode, dashed: boolean = false, connectionId?: string): void {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', (from.x + from.width / 2).toString());
    line.setAttribute('y1', (from.y + from.height).toString());
    line.setAttribute('x2', (to.x + to.width / 2).toString());
    line.setAttribute('y2', to.y.toString());
    // Use blue color for custom connections, gray for default
    const isCustomConnection = connectionId !== undefined;
    line.setAttribute('stroke', isCustomConnection ? '#3b82f6' : '#94a3b8');
    line.setAttribute('stroke-width', isCustomConnection ? '3' : '2');
    if (dashed) {
      line.setAttribute('stroke-dasharray', '5,5');
    }
    
    if (this.isEditMode && this.editModeType === 'connections' && connectionId) {
      line.setAttribute('data-connection-id', connectionId);
      line.style.cursor = 'pointer';
      line.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteConnection(connectionId);
      });
    }
    
    // Add arrow marker
    const markerId = `arrow-${connectionId || `default-${Date.now()}`}`;
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', markerId);
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '10');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '3');
    marker.setAttribute('orient', 'auto');
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '0 0, 10 3, 0 6');
    polygon.setAttribute('fill', isCustomConnection ? '#3b82f6' : '#94a3b8');
    marker.appendChild(polygon);
    svg.appendChild(marker);
    
    line.setAttribute('marker-end', `url(#${markerId})`);
    svg.appendChild(line);
  }

  drawTempConnection(svg: SVGElement, from: { x: number; y: number }, to: { x: number; y: number }): void {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', from.x.toString());
    line.setAttribute('y1', from.y.toString());
    line.setAttribute('x2', to.x.toString());
    line.setAttribute('y2', to.y.toString());
    line.setAttribute('stroke', '#f59e0b');
    line.setAttribute('stroke-width', '3');
    line.setAttribute('stroke-dasharray', '10,5');
    line.style.opacity = '0.7';
    svg.appendChild(line);
  }

  drawNode(svg: SVGElement, node: ChartNode): void {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Node rectangle
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', node.x.toString());
    rect.setAttribute('y', node.y.toString());
    rect.setAttribute('width', node.width.toString());
    rect.setAttribute('height', node.height.toString());
    rect.setAttribute('rx', '8');
    rect.setAttribute('fill', this.getRoleColor(node.role));
    rect.setAttribute('stroke', this.isEditMode ? '#3b82f6' : '#e2e8f0');
    rect.setAttribute('stroke-width', this.isEditMode ? '3' : '2');
    rect.setAttribute('class', this.isEditMode ? 'cursor-move hover:opacity-90 transition-opacity' : 'cursor-pointer hover:opacity-90 transition-opacity');
    
    group.appendChild(rect);
    
    // Set data attribute for styling (needed for CSS and drag handlers)
    if (this.isEditMode) {
      group.setAttribute('data-node-id', node.id);
    }
    
    // Add connection editing functionality
    if (this.isEditMode && this.editModeType === 'connections') {
      group.style.cursor = 'pointer';
      group.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleNodeClickForConnection(node);
      });
      
      // Highlight selected node
      if (this.selectedNodeForConnection === node.id) {
        rect.setAttribute('stroke', '#f59e0b');
        rect.setAttribute('stroke-width', '4');
      }
    }

    // Avatar circle
    const avatarSize = 40;
    const avatarX = node.x + node.width / 2;
    const avatarY = node.y + 20;
    
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', avatarX.toString());
    circle.setAttribute('cy', avatarY.toString());
    circle.setAttribute('r', (avatarSize / 2).toString());
    circle.setAttribute('fill', '#6366f1');
    group.appendChild(circle);

    // Avatar image (if available)
    const avatarUrl = this.getAvatarUrl(node);
    if (avatarUrl && !this.avatarErrors[node.id]) {
      const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      image.setAttribute('href', avatarUrl);
      image.setAttribute('x', (avatarX - avatarSize / 2).toString());
      image.setAttribute('y', (avatarY - avatarSize / 2).toString());
      image.setAttribute('width', avatarSize.toString());
      image.setAttribute('height', avatarSize.toString());
      image.setAttribute('clip-path', `circle(${avatarSize / 2}px at ${avatarX}px ${avatarY}px)`);
      image.addEventListener('error', () => {
        this.avatarErrors[node.id] = true;
        // Re-render on error
        if (this.viewMode === 'org') {
          this.renderOrgChart();
        } else {
          this.renderFlowChart();
        }
      });
      group.appendChild(image);
    } else {
      // Show initials if no avatar
      const initials = this.getInitialsFromName(node.name);
      const initialsText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      initialsText.setAttribute('x', avatarX.toString());
      initialsText.setAttribute('y', (avatarY + 5).toString());
      initialsText.setAttribute('text-anchor', 'middle');
      initialsText.setAttribute('font-size', '14');
      initialsText.setAttribute('font-weight', '600');
      initialsText.setAttribute('fill', '#ffffff');
      initialsText.textContent = initials;
      group.appendChild(initialsText);
    }

    // Name text
    const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    nameText.setAttribute('x', (node.x + node.width / 2).toString());
    nameText.setAttribute('y', (node.y + 75).toString());
    nameText.setAttribute('text-anchor', 'middle');
    nameText.setAttribute('font-size', '14');
    nameText.setAttribute('font-weight', '600');
    nameText.setAttribute('fill', '#1e293b');
    nameText.textContent = this.truncateText(node.name, 20);
    group.appendChild(nameText);

    // Position text
    if (node.position) {
      const positionText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      positionText.setAttribute('x', (node.x + node.width / 2).toString());
      positionText.setAttribute('y', (node.y + 95).toString());
      positionText.setAttribute('text-anchor', 'middle');
      positionText.setAttribute('font-size', '11');
      positionText.setAttribute('fill', '#64748b');
      positionText.textContent = this.truncateText(node.position, 25);
      group.appendChild(positionText);
    }

    // Role badge
    const roleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    roleText.setAttribute('x', (node.x + node.width / 2).toString());
    roleText.setAttribute('y', (node.y + 110).toString());
    roleText.setAttribute('text-anchor', 'middle');
    roleText.setAttribute('font-size', '10');
    roleText.setAttribute('font-weight', '500');
    roleText.setAttribute('fill', this.getRoleTextColor(node.role));
    roleText.textContent = this.getRoleLabel(node.role).toUpperCase();
    group.appendChild(roleText);

    svg.appendChild(group);
    
    // Attach drag handlers after group is added to SVG (only if in position edit mode)
    if (this.isEditMode && this.editModeType === 'positions') {
      this.attachDragHandlers(group, node);
    }
  }

  getRoleColor(role: string): string {
    const colors: { [key: string]: string } = {
      admin: '#f3e8ff',
      manager: '#dbeafe',
      member: '#f1f5f9'
    };
    return colors[role] || colors['member'];
  }

  getRoleTextColor(role: string): string {
    const colors: { [key: string]: string } = {
      admin: '#7c3aed',
      manager: '#2563eb',
      member: '#475569'
    };
    return colors[role] || colors['member'];
  }

  getRoleLabel(role: string): string {
    return this.translationService.translate(`teams.role.${role}`) || role;
  }

  truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  switchView(mode: ViewMode): void {
    this.viewMode = mode;
    setTimeout(() => {
      if (mode === 'org') {
        this.renderOrgChart();
      } else {
        this.renderFlowChart();
      }
    }, 100);
  }

  getAvatarUrl(node: ChartNode): string | null {
    if (this.avatarErrors[node.id]) {
      return null;
    }
    if (node.avatar) {
      const avatarPath = node.avatar;
      // If already a full URL, return as is
      if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
        return avatarPath;
      }
      // Extract filename from path (could be /api/uploads/avatars/filename.jpg or /uploads/avatars/filename.jpg)
      const filename = avatarPath.split('/').pop();
      if (filename) {
        // Use API endpoint: /api/users/avatar/:filename
        return `${this.apiUrl}/users/avatar/${filename}`;
      }
    }
    return null;
  }

  onAvatarError(userId: string): void {
    this.avatarErrors[userId] = true;
  }

  getUserInitials(user: User): string {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }

  getInitialsFromName(name: string): string {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  // Edit mode methods
  toggleEditMode(): void {
    if (!this.isEditMode) {
      // Entering edit mode - default to positions
      this.isEditMode = true;
      this.editModeType = 'positions';
      // Save original positions
      this.originalOrgNodes = JSON.parse(JSON.stringify(this.orgNodes));
      this.originalFlowNodes = JSON.parse(JSON.stringify(this.flowNodes));
    } else {
      // Exiting edit mode
      this.isEditMode = false;
      this.editModeType = null;
      this.selectedNodeForConnection = null;
      this.tempConnectionLine = { from: null, to: null };
    }
    // Re-render charts
    setTimeout(() => {
      if (this.viewMode === 'org') {
        this.renderOrgChart();
      } else {
        this.renderFlowChart();
      }
    }, 100);
  }

  switchEditType(type: 'positions' | 'connections'): void {
    if (!this.isEditMode) {
      this.isEditMode = true;
    }
    this.editModeType = type;
    
    if (type === 'positions') {
      // Save original positions
      this.originalOrgNodes = JSON.parse(JSON.stringify(this.orgNodes));
      this.originalFlowNodes = JSON.parse(JSON.stringify(this.flowNodes));
    } else if (type === 'connections') {
      // Load saved connections
      this.loadSavedConnections();
      this.originalConnections = JSON.parse(JSON.stringify(this.customConnections));
      this.selectedNodeForConnection = null;
      this.tempConnectionLine = { from: null, to: null };
    }
    
    // Re-render charts
    setTimeout(() => {
      if (this.viewMode === 'org') {
        this.renderOrgChart();
      } else {
        this.renderFlowChart();
      }
    }, 100);
  }

  resetChart(): void {
    if (this.viewMode === 'org') {
      this.orgNodes = JSON.parse(JSON.stringify(this.originalOrgNodes));
    } else {
      this.flowNodes = JSON.parse(JSON.stringify(this.originalFlowNodes));
    }
    setTimeout(() => {
      if (this.viewMode === 'org') {
        this.renderOrgChart();
      } else {
        this.renderFlowChart();
      }
    }, 100);
  }

  saveChart(): void {
    // Save positions to backend
    const chartData = {
      orgNodes: this.orgNodes.map(n => ({ id: n.id, x: n.x, y: n.y })),
      flowNodes: this.flowNodes.map(n => ({ id: n.id, x: n.x, y: n.y }))
    };
    
    this.http.post(`${this.apiUrl}/teams/charts/positions`, chartData).subscribe({
      next: () => {
        // Update original positions
        this.originalOrgNodes = JSON.parse(JSON.stringify(this.orgNodes));
        this.originalFlowNodes = JSON.parse(JSON.stringify(this.flowNodes));
        
        // Also save to localStorage as backup
        localStorage.setItem('teamChartPositions', JSON.stringify({
          ...chartData,
          timestamp: new Date().toISOString()
        }));
        
        // Show success notification
        this.showNotification('teams.charts.positionsSaved', 'success');
      },
      error: (err) => {
        console.error('Error saving chart positions', err);
        this.showNotification('teams.charts.saveError', 'error');
      }
    });
  }

  loadSavedPositions(): void {
    const saved = localStorage.getItem('teamChartPositions');
    if (saved) {
      try {
        const chartData = JSON.parse(saved);
        // Apply saved positions
        chartData.orgNodes?.forEach((savedNode: { id: string; x: number; y: number }) => {
          const node = this.orgNodes.find(n => n.id === savedNode.id);
          if (node) {
            node.x = savedNode.x;
            node.y = savedNode.y;
          }
        });
        chartData.flowNodes?.forEach((savedNode: { id: string; x: number; y: number }) => {
          const node = this.flowNodes.find(n => n.id === savedNode.id);
          if (node) {
            node.x = savedNode.x;
            node.y = savedNode.y;
          }
        });
        setTimeout(() => {
          if (this.viewMode === 'org') {
            this.renderOrgChart();
          } else {
            this.renderFlowChart();
          }
        }, 100);
      } catch (e) {
        console.error('Error loading saved positions', e);
      }
    }
  }

  attachDragHandlers(group: SVGElement, node: ChartNode): void {
    // Remove existing handlers if any
    const existingHandler = (group as any).__dragHandler;
    if (existingHandler) {
      group.removeEventListener('mousedown', existingHandler as EventListener);
      Array.from(group.children).forEach(child => {
        child.removeEventListener('mousedown', existingHandler as EventListener);
      });
    }

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialX = 0;
    let initialY = 0;
    let transformX = 0;
    let transformY = 0;

    const getSVGPoint = (e: MouseEvent): { x: number; y: number } | null => {
      const svg = group.ownerSVGElement;
      if (!svg) return null;
      
      try {
        const rect = svg.getBoundingClientRect();
        const viewBox = svg.viewBox.baseVal;
        
        if (viewBox.width === 0 || viewBox.height === 0) {
          // Fallback if viewBox is not set
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          return { x, y };
        }
        
        const scaleX = viewBox.width / rect.width;
        const scaleY = viewBox.height / rect.height;
        
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        return { x, y };
      } catch (err) {
        console.error('Error getting SVG point', err);
        return null;
      }
    };

    const onMouseDown = (e: Event) => {
      if (!this.isEditMode) return;
      const mouseEvent = e as MouseEvent;
      mouseEvent.preventDefault();
      mouseEvent.stopPropagation();
      
      const point = getSVGPoint(mouseEvent);
      if (!point) return;
      
      isDragging = true;
      startX = point.x;
      startY = point.y;
      initialX = node.x;
      initialY = node.y;
      transformX = 0;
      transformY = 0;
      
      group.style.opacity = '0.7';
      group.style.pointerEvents = 'none';
      
      const onMouseMoveHandler = (moveEvent: MouseEvent) => {
        if (!isDragging || !this.isEditMode) return;
        moveEvent.preventDefault();
        
        const movePoint = getSVGPoint(moveEvent);
        if (!movePoint) return;
        
        const deltaX = movePoint.x - startX;
        const deltaY = movePoint.y - startY;
        
        transformX = deltaX;
        transformY = deltaY;
        
        // Apply transform to group for smooth dragging
        group.setAttribute('transform', `translate(${transformX}, ${transformY})`);
      };

      const onMouseUpHandler = () => {
        if (isDragging) {
          isDragging = false;
          group.style.opacity = '1';
          group.style.pointerEvents = 'auto';
          group.removeAttribute('transform');
          
          // Final update to node position
          node.x = initialX + transformX;
          node.y = initialY + transformY;
          
          // Re-render to update connections
          setTimeout(() => {
            if (this.viewMode === 'org') {
              this.renderOrgChart();
            } else {
              this.renderFlowChart();
            }
          }, 10);
          
          document.removeEventListener('mousemove', onMouseMoveHandler);
          document.removeEventListener('mouseup', onMouseUpHandler);
        }
      };

      document.addEventListener('mousemove', onMouseMoveHandler);
      document.addEventListener('mouseup', onMouseUpHandler);
    };

    // Store handler reference
    (group as any).__dragHandler = onMouseDown;

    // Attach to the group with proper type casting
    group.addEventListener('mousedown', onMouseDown as EventListener);
    group.style.cursor = 'move';
    group.style.userSelect = 'none';
    
    // Also attach to child elements to ensure dragging works
    Array.from(group.children).forEach(child => {
      child.addEventListener('mousedown', onMouseDown as EventListener);
      (child as SVGElement).style.cursor = 'move';
      (child as SVGElement).style.userSelect = 'none';
    });
  }

  calculateOrgChartHeight(): number {
    const admins = this.users.filter(u => u.role === 'admin');
    const managers = this.users.filter(u => u.role === 'manager');
    const members = this.users.filter(u => u.role === 'member');
    
    let levels = 0;
    if (admins.length > 0) levels++;
    if (managers.length > 0) levels++;
    if (members.length > 0) levels++;
    
    return Math.max(400, levels * this.VERTICAL_SPACING + 100);
  }

  // Connection editing methods

  handleNodeClickForConnection(node: ChartNode): void {
    if (!this.selectedNodeForConnection) {
      // First node selected
      this.selectedNodeForConnection = node.id;
      const centerX = node.x + node.width / 2;
      const centerY = node.y + node.height / 2;
      this.tempConnectionLine.from = { x: centerX, y: centerY };
      this.tempConnectionLine.to = null;
    } else if (this.selectedNodeForConnection === node.id) {
      // Clicked same node - deselect
      this.selectedNodeForConnection = null;
      this.tempConnectionLine = { from: null, to: null };
    } else {
      // Second node selected - create connection
      const fromNode = (this.viewMode === 'org' ? this.orgNodes : this.flowNodes)
        .find(n => n.id === this.selectedNodeForConnection);
      
      if (fromNode) {
        // Check if connection already exists
        const exists = this.customConnections.some(
          c => c.from === fromNode.id && c.to === node.id
        );
        
        if (!exists) {
          const connectionId = `conn-${Date.now()}`;
          this.customConnections.push({
            from: fromNode.id,
            to: node.id,
            id: connectionId
          });
        }
      }
      
      // Reset selection
      this.selectedNodeForConnection = null;
      this.tempConnectionLine = { from: null, to: null };
    }
    
    // Re-render to show changes
    setTimeout(() => {
      if (this.viewMode === 'org') {
        this.renderOrgChart();
      } else {
        this.renderFlowChart();
      }
    }, 10);
  }

  deleteConnection(connectionId: string): void {
    this.customConnections = this.customConnections.filter(c => c.id !== connectionId);
    setTimeout(() => {
      if (this.viewMode === 'org') {
        this.renderOrgChart();
      } else {
        this.renderFlowChart();
      }
    }, 10);
  }

  saveConnections(): void {
    // Save connections to backend
    this.http.post(`${this.apiUrl}/teams/charts/connections`, {
      connections: this.customConnections
    }).subscribe({
      next: () => {
        this.originalConnections = JSON.parse(JSON.stringify(this.customConnections));
        
        // Also save to localStorage as backup
        localStorage.setItem('teamChartConnections', JSON.stringify({
          connections: this.customConnections,
          timestamp: new Date().toISOString()
        }));
        
        // Show success notification
        this.showNotification('teams.charts.connectionsSaved', 'success');
        
        // Re-render to show saved state
        setTimeout(() => {
          if (this.viewMode === 'org') {
            this.renderOrgChart();
          } else {
            this.renderFlowChart();
          }
        }, 10);
      },
      error: (err) => {
        console.error('Error saving connections', err);
        this.showNotification('teams.charts.saveError', 'error');
      }
    });
  }

  resetConnections(): void {
    this.customConnections = JSON.parse(JSON.stringify(this.originalConnections));
    this.selectedNodeForConnection = null;
    this.tempConnectionLine = { from: null, to: null };
    setTimeout(() => {
      if (this.viewMode === 'org') {
        this.renderOrgChart();
      } else {
        this.renderFlowChart();
      }
    }, 10);
  }

  loadSavedConnections(): void {
    const saved = localStorage.getItem('teamChartConnections');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.customConnections = data.connections || [];
      } catch (e) {
        console.error('Error loading saved connections', e);
        this.customConnections = [];
      }
    } else {
      this.customConnections = [];
    }
  }

  showNotification(messageKey: string, type: 'success' | 'error' | 'info' = 'success'): void {
    const message = this.translationService.translate(messageKey) || messageKey;
    this.notification = { message, type };
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      this.notification = null;
    }, 3000);
  }

  closeNotification(): void {
    this.notification = null;
  }
}

