# 🏠 Guía de Desarrollo Local - ProjectFlow

## Configuración del TenantId en Desarrollo Local

### ¿Cómo funciona el Multitenancy?

El sistema ProjectFlow es multitenant, lo que significa que cada empresa tiene sus propios datos aislados. En producción, esto funciona con subdominios:
- `empresa1.projectflow.com`
- `empresa2.projectflow.com`

En desarrollo local, usamos el header `X-Tenant-Id` para identificar la empresa.

---

## 🚀 Pasos para Configurar y Usar

### 1. Iniciar el Backend

```bash
cd backend
npm install
npm run dev
```

El backend estará en: `http://localhost:3000`

### 2. Iniciar el Frontend

```bash
cd frontend
npm install
npm start
```

El frontend estará en: `http://localhost:4200`

### 3. Crear una Empresa y Usuario (Primera vez)

#### Opción A: Usando Postman

1. Importa la colección `ProjectFlow_API.postman_collection.json`
2. Ejecuta la request **"1. Register (Crear Empresa + Usuario)"**
3. Esto creará:
   - Una empresa con el subdomain especificado
   - Un usuario administrador para esa empresa
   - Guardará automáticamente los tokens y el subdomain en variables

**Ejemplo de datos:**
```json
{
  "email": "admin@empresa1.com",
  "password": "password123",
  "firstName": "Juan",
  "lastName": "Pérez",
  "companyName": "Mi Empresa Demo",
  "subdomain": "empresa1"
}
```

#### Opción B: Usando cURL

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@empresa1.com",
    "password": "password123",
    "firstName": "Juan",
    "lastName": "Pérez",
    "companyName": "Mi Empresa Demo",
    "subdomain": "empresa1"
  }'
```

### 4. Iniciar Sesión desde el Frontend

1. Abre `http://localhost:4200`
2. Ve a la página de login
3. Ingresa:
   - **Email:** `admin@empresa1.com`
   - **Password:** `password123`
4. Haz clic en "Iniciar sesión"

**¿Qué pasa automáticamente?**
- El frontend hace login al backend
- El backend devuelve el `companyId` (subdomain) en la respuesta
- El `AuthService` guarda el `companyId` en `localStorage`
- El interceptor `tenant.interceptor.ts` agrega automáticamente el header `X-Tenant-Id` a todas las peticiones HTTP

### 5. Usar la Aplicación

Una vez logueado, todas las peticiones HTTP incluyen automáticamente:
```
X-Tenant-Id: empresa1
```

No necesitas hacer nada más. El sistema funciona automáticamente.

---

## 🔍 Cómo Funciona Internamente

### Backend (`tenantMiddleware.js`)

El middleware detecta el tenant en este orden:

1. **Subdominio del host** (si estás usando subdominios):
   - `empresa1.localhost:3000` → tenantId = `empresa1`
   - `empresa2.localhost:3000` → tenantId = `empresa2`

2. **Header `X-Tenant-Id`** (fallback para desarrollo local):
   - Si no hay subdominio, usa el header
   - `X-Tenant-Id: empresa1` → tenantId = `empresa1`

### Frontend (`tenant.interceptor.ts`)

El interceptor:
1. Obtiene el `companyId` del `AuthService`
2. Lo agrega automáticamente como header `X-Tenant-Id` a todas las peticiones
3. Excluye la ruta `/auth/register` (no necesita tenant)

### AuthService

Guarda el `companyId` en `localStorage` después de:
- Login exitoso
- Registro exitoso

---

## 📝 Ejemplos de Uso

### Crear Múltiples Empresas

Puedes crear varias empresas para probar el multitenancy:

**Empresa 1:**
```json
{
  "email": "admin@empresa1.com",
  "password": "password123",
  "firstName": "Juan",
  "lastName": "Pérez",
  "companyName": "Empresa 1",
  "subdomain": "empresa1"
}
```

**Empresa 2:**
```json
{
  "email": "admin@empresa2.com",
  "password": "password123",
  "firstName": "María",
  "lastName": "González",
  "companyName": "Empresa 2",
  "subdomain": "empresa2"
}
```

Para cambiar de empresa, simplemente:
1. Haz logout
2. Haz login con las credenciales de la otra empresa
3. El sistema cambiará automáticamente el `companyId`

### Verificar el TenantId en el Frontend

Abre la consola del navegador y ejecuta:
```javascript
localStorage.getItem('companyId')
// Debería mostrar: "empresa1" (o el subdomain que usaste)
```

### Verificar en el Backend

El backend agrega el `companyId` a todas las requests:
```javascript
// En cualquier controller/service
console.log(req.companyId); // "empresa1"
```

---

## 🛠️ Solución de Problemas

### Error: "Company ID is required"

**Causa:** El header `X-Tenant-Id` no se está enviando.

**Solución:**
1. Verifica que hayas hecho login correctamente
2. Verifica en localStorage: `localStorage.getItem('companyId')`
3. Si está vacío, haz logout y login nuevamente

### Error: "Subdomain already taken"

**Causa:** Ya existe una empresa con ese subdomain.

**Solución:**
- Usa un subdomain diferente
- O elimina la empresa existente de la base de datos

### Las peticiones no incluyen el header X-Tenant-Id

**Verificación:**
1. Abre DevTools → Network
2. Haz una petición (ej: cargar tableros)
3. Revisa los headers de la petición
4. Debe incluir: `X-Tenant-Id: empresa1`

**Si no aparece:**
- Verifica que el interceptor esté registrado en `app.config.ts` o `main.ts`
- Verifica que `localStorage.getItem('companyId')` tenga un valor

---

## 📚 Archivos Clave

- **Backend Middleware:** `backend/src/middleware/tenantMiddleware.js`
- **Frontend Interceptor:** `frontend/src/app/core/interceptors/tenant.interceptor.ts`
- **Auth Service:** `frontend/src/app/core/services/auth.service.ts`
- **Postman Collection:** `ProjectFlow_API.postman_collection.json`

---

## ✅ Checklist de Configuración

- [ ] Backend corriendo en `http://localhost:3000`
- [ ] Frontend corriendo en `http://localhost:4200`
- [ ] MongoDB corriendo y conectado
- [ ] Empresa y usuario creados (usando Postman o cURL)
- [ ] Login exitoso desde el frontend
- [ ] `companyId` guardado en localStorage
- [ ] Header `X-Tenant-Id` presente en las peticiones HTTP

---

¡Listo! Ya puedes desarrollar localmente con multitenancy funcionando. 🎉





