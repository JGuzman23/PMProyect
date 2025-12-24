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
const PORT = process.env.PORT || 3000;

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

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (como mobile apps o Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id']
}));
app.use(express.json());
app.use(cookieParser());
app.use(tenantMiddleware);

// Servir archivos estáticos
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use('/uploads', express.static(join(__dirname, 'uploads')));

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
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  });

