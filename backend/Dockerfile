# Backend Dockerfile
FROM node:18-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json ./

# Instalar dependencias de producción
# npm install generará package-lock.json automáticamente si no existe
RUN npm install --omit=dev

# Copiar el resto de los archivos de la aplicación
COPY . .

# Crear directorios para uploads y datos con permisos adecuados
# Nota: Estos directorios pueden ser sobrescritos por volúmenes de Docker
# Los directorios se crearán en tiempo de ejecución en server.js con permisos adecuados
RUN mkdir -p uploads/tasks && \
    mkdir -p uploads/avatars && \
    mkdir -p data && \
    chmod -R 777 uploads data

# Exponer el puerto
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "server.js"]

