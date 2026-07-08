import helmet from 'helmet';

/**
 * Helmet configuration with strict security headers:
 * - Content Security Policy (CSP) restricting all sources
 * - HSTS with 1-year max-age and includeSubDomains
 * - X-Frame-Options DENY
 * - X-Content-Type-Options nosniff
 * - Referrer-Policy strict-origin-when-cross-origin
 */
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny',
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  crossOriginEmbedderPolicy: false, // Disable for API usage
});
