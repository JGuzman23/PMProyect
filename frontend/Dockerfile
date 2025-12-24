# Frontend Dockerfile - Multi-stage build
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json ./

# Instalar dependencias
# npm install generará package-lock.json automáticamente si no existe
RUN npm install

# Copiar el resto de los archivos
COPY . .

# Construir la aplicación Angular para producción
# La URL de la API se puede configurar en tiempo de ejecución o build
RUN npm run build -- --configuration production

# Stage 2: Production
FROM nginx:alpine

# Copiar los archivos construidos desde el stage de build
COPY --from=builder /app/dist/projectflow/browser /usr/share/nginx/html

# Copiar configuración personalizada de nginx (opcional)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer el puerto 80
EXPOSE 80

# Comando para iniciar nginx
CMD ["nginx", "-g", "daemon off;"]

