import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { tenantMiddleware } from './middleware/tenant.js';
import { errorHandler } from './middleware/error.js';

// Import routes
import moodRoutes from './routes/mood.routes.js';
import journalRoutes from './routes/journal.routes.js';
import checkinRoutes from './routes/checkin.routes.js';
import resourcesRoutes from './routes/resources.routes.js';
import syncRoutes from './routes/sync.routes.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' })); // Increased for offline sync payloads
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'seabuddy-backend',
  });
});

// Apply tenant middleware to all API routes
app.use('/api', tenantMiddleware);

// API Routes
app.use('/api/moods', moodRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/sync', syncRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
