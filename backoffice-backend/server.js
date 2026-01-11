import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB } from './src/database/connection.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import companyRoutes from './src/routes/companyRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/companies', companyRoutes);

app.use(errorHandler);

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Backoffice Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  });









