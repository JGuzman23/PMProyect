# Configuración de Nginx para archivos grandes

El error 413 (Request Entity Too Large) indica que el nginx externo que maneja `api.signops.pro` está limitando el tamaño de los archivos a 1MB por defecto.

## Pasos para solucionar:

### 1. Localizar el archivo de configuración de nginx

El dominio `api.signops.pro` está siendo manejado por un nginx externo en el servidor. Necesitas encontrar y editar su configuración:

```bash
# Buscar archivos de configuración
sudo find /etc/nginx -name "*api.signops*" -o -name "*signops*"
sudo ls -la /etc/nginx/sites-available/
sudo ls -la /etc/nginx/sites-enabled/
sudo ls -la /etc/nginx/conf.d/

# Ver qué archivos están activos
sudo nginx -T | grep -A 20 "api.signops.pro"
```

### 2. Editar la configuración de nginx

**IMPORTANTE**: El `client_max_body_size` DEBE estar en el bloque `server`, no solo en `location`. Si solo lo pones en `location`, puede no funcionar.

Edita el archivo de configuración que maneja `api.signops.pro` y agrega/modifica estas líneas:

```nginx
server {
    listen 443 ssl http2;
    server_name api.signops.pro;

    # CRÍTICO: Aumentar el límite de tamaño - DEBE estar aquí en el bloque server
    client_max_body_size 30M;
    
    # Timeouts extendidos para archivos grandes
    proxy_read_timeout 600s;
    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;
    client_body_timeout 600s;
    
    # Desactivar buffering para archivos grandes
    proxy_request_buffering off;
    proxy_buffering off;
    client_body_buffer_size 128k;

    location / {
        proxy_pass http://localhost:3001;  # O la IP:puerto de tu backend Docker
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Repetir configuración en location (redundante pero seguro)
        client_max_body_size 30M;
        proxy_read_timeout 600s;
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        client_body_timeout 600s;
        proxy_request_buffering off;
        proxy_buffering off;
    }
}
```

### 2.1. Alternativa: Configurar en nginx.conf principal

Si prefieres, también puedes configurar un límite global en `/etc/nginx/nginx.conf` dentro del bloque `http {}`:

```nginx
http {
    # ... otras configuraciones ...
    
    # Límite global para todos los servidores (puede ser sobrescrito por server blocks)
    client_max_body_size 30M;
    
    # ... resto de configuraciones ...
}
```

### 3. Verificar y recargar nginx

```bash
# Verificar que la configuración sea válida
sudo nginx -t

# Si es válida, recargar nginx
sudo systemctl reload nginx
# O
sudo service nginx reload
```

### 4. Verificar que funciona

Después de recargar nginx, intenta subir un archivo de más de 1MB. El error 413 debería desaparecer.

## Nota importante

Si `api.signops.pro` está usando un proxy reverso como Traefik, Caddy, o Cloudflare, también necesitarás configurar los límites allí.

