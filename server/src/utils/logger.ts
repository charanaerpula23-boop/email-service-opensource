import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'AUDIT' | 'DEBUG';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_DIR = path.resolve(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');
const AUDIT_FILE = path.join(LOG_DIR, 'audit.log');

function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function formatEntry(entry: LogEntry): string {
  const base = `[${entry.timestamp}] [${entry.level}] ${entry.message}`;
  if (entry.context && Object.keys(entry.context).length > 0) {
    return `${base} ${JSON.stringify(entry.context)}`;
  }
  return base;
}

function writeToFile(filePath: string, line: string): void {
  try {
    ensureLogDir();
    fs.appendFileSync(filePath, line + '\n', 'utf-8');
  } catch {
    // Silently fail file writes — console output is primary
  }
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };

  const formatted = formatEntry(entry);

  switch (level) {
    case 'ERROR':
      console.error(formatted);
      break;
    case 'WARN':
      console.warn(formatted);
      break;
    case 'DEBUG':
      if (process.env.LOG_LEVEL === 'debug') {
        console.debug(formatted);
      }
      break;
    default:
      console.log(formatted);
      break;
  }

  writeToFile(LOG_FILE, formatted);
}

export const logger = {
  info(message: string, context?: Record<string, unknown>): void {
    log('INFO', message, context);
  },

  warn(message: string, context?: Record<string, unknown>): void {
    log('WARN', message, context);
  },

  error(message: string, context?: Record<string, unknown>): void {
    log('ERROR', message, context);
  },

  debug(message: string, context?: Record<string, unknown>): void {
    log('DEBUG', message, context);
  },

  audit(action: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'AUDIT',
      message: action,
      context,
    };
    const formatted = formatEntry(entry);
    console.log(formatted);
    writeToFile(LOG_FILE, formatted);
    writeToFile(AUDIT_FILE, formatted);
  },
};
