import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB } from './src/database/connection.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { tenantMiddleware } from './src/middleware/tenantMiddleware.js';

// Routes
import authRoutes from './src/modules/auth/routes.js';
import userRoutes from './src/modules/users/routes.js';
import projectRoutes from './src/modules/projects/routes.js';
import taskRoutes from './src/modules/tasks/routes.js';
import boardRoutes from './src/modules/boards/routes.js';
import clientRoutes from './src/modules/clients/routes.js';
import teamRoutes from './src/modules/teams/routes.js';
import adminRoutes from './src/modules/admin/routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// Configurar CORS con orígenes permitidos desde variables de entorno
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'https://signops.pro',
      'https://www.signops.pro',
      'http://localhost:4200',
      'http://localhost:80',
      'http://localhost'
    ];

// Configurar CORS
app.use(cors({
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (como aplicaciones móviles, Postman, o solicitudes del mismo servidor)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // En desarrollo, mostrar el origen que está siendo rechazado
      console.log('Origen no permitido por CORS:', origin);
      callback(null, true); // Permitir temporalmente para debug, cambiar a false en producción
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Tenant-Id'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 horas
}));


app.use(express.json());
app.use(cookieParser());
app.use(tenantMiddleware);

// Servir archivos estáticos
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Asegurar que los directorios de uploads existan (necesario cuando se usan volúmenes de Docker)
const uploadsDir = join(__dirname, 'uploads');
const avatarsDir = join(__dirname, 'uploads', 'avatars');
const tasksDir = join(__dirname, 'uploads', 'tasks');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}
if (!fs.existsSync(tasksDir)) {
  fs.mkdirSync(tasksDir, { recursive: true });
}

app.use('/uploads', express.static(uploadsDir));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/admin', adminRoutes);

// Error handler
app.use(errorHandler);

// Connect to database and start server
connectDB()
  .then(() => {
    // Escuchar en 0.0.0.0 para que sea accesible desde fuera del contenedor Docker
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
        console.log('CORS configurado para:', allowedOrigins);

    });
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  });

