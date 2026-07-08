import cors from 'cors';

/**
 * CORS configuration allowing the CLIENT_URL from environment.
 * Credentials are enabled for cookie/token-based auth.
 */
export function createCorsConfig() {
  const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:3000';

  // Support multiple origins separated by commas
  const allowedOrigins = clientUrl.split(',').map((o) => o.trim());

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, mobile apps)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Limit'],
    maxAge: 86400, // 24 hours preflight cache
  });
}
