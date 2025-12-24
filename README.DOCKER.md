# Docker Setup - ProjectFlow

Este documento explica cómo ejecutar ProjectFlow usando Docker y Docker Compose.

## Requisitos Previos

- Docker (versión 20.10 o superior)
- Docker Compose (versión 2.0 o superior)

## Configuración

1. **Crear archivo de variables de entorno**

   Copia el archivo `.env.example` a `.env` y ajusta las variables según tu entorno:

   ```bash
   cp .env.example .env
   ```

   Edita el archivo `.env` con tus valores:

   ```env
   # MongoDB debe estar corriendo externamente
   MONGODB_URI=mongodb://localhost:27017/projectflow
   # O para MongoDB remoto:
   # MONGODB_URI=mongodb://usuario:password@host:puerto/database
   
   JWT_SECRET=tu-secret-key-muy-segura
   JWT_REFRESH_SECRET=tu-refresh-secret-key-muy-segura
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   ```

2. **Actualizar la URL de la API en el frontend**

   Edita `frontend/src/environments/environment.prod.ts` y asegúrate de que la URL de la API sea `/api` (nginx hará el proxy al backend).

## Construcción y Ejecución

### Construir y ejecutar todos los servicios

```bash
docker-compose up -d --build
```

Este comando:
- Construye las imágenes de Docker para backend y frontend
- Inicia MongoDB, backend y frontend
- Crea una red Docker para que los servicios se comuniquen

### Ver los logs

```bash
# Ver todos los logs
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### Detener los servicios

```bash
docker-compose down
```

### Detener y eliminar volúmenes (incluyendo datos de MongoDB)

```bash
docker-compose down -v
```

## Acceso a la Aplicación

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3000/api
- **MongoDB**: Debe estar configurado externamente (no incluido en Docker)

## Estructura de Servicios

### Backend
- **Puerto**: 3000
- **Volúmenes**: 
  - `backend_uploads`: Archivos subidos por los usuarios
  - `backend_data`: Datos del backend (si aplica)
- **MongoDB**: Debe estar configurado externamente (ver configuración)

### Frontend
- **Puerto**: 80
- **Servidor**: Nginx
- **Depende de**: Backend

## Comandos Útiles

### Reconstruir un servicio específico

```bash
docker-compose build backend
docker-compose up -d backend
```

### Ejecutar comandos dentro de un contenedor

```bash
# Acceder al contenedor del backend
docker-compose exec backend sh

# Acceder al contenedor de MongoDB
docker-compose exec mongodb mongosh
```

### Ver el estado de los servicios

```bash
docker-compose ps
```

### Acceder a los volúmenes del backend

```bash
# Ver información de los volúmenes
docker volume ls

# Inspeccionar un volumen específico
docker volume inspect projectflow_backend_uploads
docker volume inspect projectflow_backend_data

# Acceder a los archivos del volumen (desde el contenedor)
docker-compose exec backend ls -la /app/uploads
docker-compose exec backend ls -la /app/data
```

## Solución de Problemas

### El backend no se conecta a MongoDB

Verifica que:
1. MongoDB esté corriendo externamente (fuera de Docker)
2. La variable `MONGODB_URI` en `.env` sea correcta y apunte a tu instancia de MongoDB
3. Si MongoDB está en el mismo host, usa `localhost` o la IP del host
4. Si MongoDB está en otro servidor, asegúrate de que sea accesible desde el contenedor

### El frontend no puede acceder al backend

Verifica que:
1. El backend esté corriendo en el puerto 3000
2. La configuración de nginx esté correcta
3. La URL de la API en `environment.prod.ts` sea `/api`

### Limpiar todo y empezar de nuevo

```bash
# Detener y eliminar contenedores y redes (mantiene volúmenes)
docker-compose down

# Detener y eliminar contenedores, redes y volúmenes (CUIDADO: elimina datos)
docker-compose down -v

# Eliminar imágenes
docker-compose down --rmi all

# Limpiar sistema Docker (cuidado: elimina todo)
docker system prune -a
```

**Nota**: Usar `docker-compose down -v` eliminará los volúmenes `backend_uploads` y `backend_data`, perdiendo todos los archivos subidos y datos almacenados localmente.

## Producción

Para producción, considera:

1. **Seguridad**:
   - Cambiar todas las contraseñas por defecto
   - Usar secretos de Docker o un gestor de secretos
   - Configurar HTTPS con certificados SSL

2. **Rendimiento**:
   - Usar un reverse proxy (como Traefik o Nginx) delante de los servicios
   - Configurar límites de recursos en docker-compose.yml
   - Implementar estrategias de backup para MongoDB

3. **Monitoreo**:
   - Agregar servicios de monitoreo (Prometheus, Grafana)
   - Configurar logs centralizados

4. **Escalabilidad**:
   - Considerar usar Docker Swarm o Kubernetes para orquestación
   - Implementar balanceadores de carga

