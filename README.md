# ProjectFlow - Sistema de Gestión de Proyectos Multitenant

SaaS multitenant estilo ClickUp/Jira para gestión de proyectos con arquitectura completa frontend + backend.

## 🏗️ Estructura del Proyecto

```
PMProyect/
├── backend/                 # Backend principal (Node.js + Express)
├── frontend/                # Frontend principal (Angular)
├── backoffice-backend/      # Backend del backoffice
├── backoffice-frontend/     # Frontend del backoffice
└── README.md
```

## 🚀 Tecnologías

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT (access + refresh tokens)
- Zod para validaciones
- Bcrypt para contraseñas
- Arquitectura limpia: routes → controllers → services → repositories → models

### Frontend
- Angular 17 (standalone components)
- TailwindCSS
- Angular CDK para drag & drop
- RxJS
- Interceptores HTTP

## 📦 Instalación

### Backend Principal

```bash
cd backend
npm install
cp .env.example .env
# Editar .env con tus configuraciones
npm run dev
```

### Frontend Principal

```bash
cd frontend
npm install
npm start
```

### Backoffice Backend

```bash
cd backoffice-backend
npm install
npm run dev
```

### Backoffice Frontend

```bash
cd backoffice-frontend
npm install
npm start
```

## 🔐 Multitenancy

El sistema es multitenant por subdominio:
- `empresa1.projectflow.com`
- `empresa2.projectflow.com`

El backend detecta el tenant mediante:
1. Subdominio del host
2. Header `X-Tenant-Id` (para desarrollo local)

Todos los queries se filtran automáticamente con `{ companyId: tenantId }`.

### 🏠 Desarrollo Local

En desarrollo local, el sistema funciona con el header `X-Tenant-Id`:

1. **Crear empresa y usuario** (solo una vez):
   ```bash
   POST http://localhost:3000/api/auth/register
   {
     "email": "admin@empresa1.com",
     "password": "password123",
     "firstName": "Juan",
     "lastName": "Pérez",
     "companyName": "Mi Empresa",
     "subdomain": "empresa1"
   }
   ```

2. **Login** (el frontend guarda automáticamente el `companyId` en localStorage):
   - El interceptor `tenant.interceptor.ts` agrega automáticamente el header `X-Tenant-Id` a todas las peticiones
   - El `companyId` se guarda después del login/register

3. **Para Postman/API directa**, agrega el header:
   ```
   X-Tenant-Id: empresa1
   ```

**Nota:** El frontend Angular ya maneja esto automáticamente. Solo necesitas hacer login y el sistema guardará el `companyId` para todas las peticiones siguientes.

## 📋 Módulos Implementados

### Frontend Principal
- ✅ Autenticación (login, register, forgot password)
- ✅ Dashboard con sidebar y navbar
- ✅ Board (Kanban) con drag & drop
- ✅ Calendario (vista mensual y semanal)
- ✅ Clientes (CRUD completo)
- ✅ Equipos (CRUD de usuarios)
- ✅ Administración (etiquetas y estados)

### Backend Principal
- ✅ Autenticación JWT
- ✅ Usuarios
- ✅ Proyectos
- ✅ Tableros (Boards)
- ✅ Tareas (Tasks)
- ✅ Clientes
- ✅ Equipos
- ✅ Administración (labels, board statuses)

### Backoffice
- ✅ Dashboard global
- ✅ CRUD de empresas
- ✅ Activar/desactivar tenants
- ✅ Estadísticas por empresa
- ✅ Gestión de planes

## 🔑 Características

- **Multitenancy**: Aislamiento completo por empresa
- **JWT Auth**: Access y refresh tokens
- **Drag & Drop**: Kanban board interactivo
- **Calendario**: Vista mensual y semanal
- **Roles**: Admin, Manager, Member
- **Planes**: Free, Pro, Enterprise

## 📝 Variables de Entorno

### Backend Principal (.env)
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/projectflow
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=development
```

### Backoffice Backend
Usa la misma base de datos MongoDB.

## 🎯 Próximos Pasos

1. Configurar MongoDB
2. Ejecutar migraciones si es necesario
3. Configurar subdominios en desarrollo (hosts file o proxy)
4. Personalizar estilos y branding

## 📄 Licencia

Este proyecto es privado y confidencial.

# PMProyect
