import express from 'express';
import dotenv from 'dotenv';
import { helmetConfig } from './middleware/helmet.config.js';
import { createCorsConfig } from './middleware/cors.config.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { sanitizeMiddleware } from './middleware/sanitize.js';
import { registerDefaultHandlers } from './services/queue.service.js';
import authRoutes from './routes/auth.routes.js';
import emailRoutes from './routes/email.routes.js';
import keysRoutes from './routes/keys.routes.js';
import dnsRoutes from './routes/dns.routes.js';
import { logger } from './utils/logger.js';
import { getDb, closeDb } from './db/connection.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT ?? '4000', 10);

// ─── Global Middleware ───────────────────────────────────────────────────────

// Security headers
app.use(helmetConfig);

// CORS
app.use(createCorsConfig());

// Rate limiting on all API routes
app.use('/api', apiLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeMiddleware);

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/keys', keysRoutes);
app.use('/api/dns', dnsRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ─── Global Error Handler ────────────────────────────────────────────────────

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    logger.error('Unhandled error', {
      message: err.message,
      stack: err.stack,
    });

    // Don't leak error details in production
    const isProduction = process.env.NODE_ENV === 'production';

    res.status(500).json({
      error: isProduction ? 'Internal server error' : err.message,
    });
  }
);

// ─── Server Startup ──────────────────────────────────────────────────────────

function startServer(): void {
  // Initialize database (triggers schema creation)
  getDb();
  logger.info('Database initialized');

  // Register queue handlers and start queue
  registerDefaultHandlers();

  app.listen(PORT, () => {
    logger.info(`Server started on port ${PORT}`, {
      port: PORT,
      environment: process.env.NODE_ENV ?? 'development',
    });
  });
}

// Graceful shutdown
function gracefulShutdown(signal: string): void {
  logger.info(`${signal} received, shutting down gracefully`);
  closeDb();
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    message: error.message,
    stack: error.stack,
  });
  closeDb();
  process.exit(1);
});

startServer();

export default app;
