import { ImapFlow } from 'imapflow';
import { EmailModel, type CreateEmailInput } from '../models/email.model.js';
import { logger } from '../utils/logger.js';

interface ImapConfig {
  host: string;
  port: number;
  auth: {
    user: string;
    pass: string;
  };
  secure?: boolean;
}

// Active connections per user
const activeConnections = new Map<string, ImapFlow>();

function getImapConfig(): ImapConfig {
  return {
    host: process.env.IMAP_HOST ?? 'localhost',
    port: parseInt(process.env.IMAP_PORT ?? '993', 10),
    secure: process.env.IMAP_SECURE !== 'false',
    auth: {
      user: process.env.IMAP_USER ?? '',
      pass: process.env.IMAP_PASS ?? '',
    },
  };
}

function createImapClient(config?: ImapConfig): ImapFlow {
  const imapConfig = config ?? getImapConfig();
  return new ImapFlow({
    host: imapConfig.host,
    port: imapConfig.port,
    secure: imapConfig.secure,
    auth: imapConfig.auth,
    logger: false as unknown as import('imapflow').Logger,
    emitLogs: false,
  });
}

export const ImapService = {
  async connectIMAP(userId: string, config?: ImapConfig): Promise<ImapFlow> {
    // If already connected, return existing
    const existing = activeConnections.get(userId);
    if (existing && existing.usable) {
      return existing;
    }

    const client = createImapClient(config);

    try {
      await client.connect();
      activeConnections.set(userId, client);
      logger.info('IMAP connected', { userId });

      client.on('close', () => {
        activeConnections.delete(userId);
        logger.info('IMAP connection closed', { userId });
      });

      client.on('error', (err: Error) => {
        logger.error('IMAP error', {
          userId,
          error: err.message,
        });
        activeConnections.delete(userId);
      });

      return client;
    } catch (error) {
      logger.error('IMAP connection failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },

  async syncInbox(userId: string, config?: ImapConfig): Promise<number> {
    const client = await ImapService.connectIMAP(userId, config);
    let syncedCount = 0;

    try {
      const lock = await client.getMailboxLock('INBOX');
      try {
        // Fetch messages from the last 7 days
        const since = new Date();
        since.setDate(since.getDate() - 7);

        const messages = client.fetch(
          { since },
          {
            envelope: true,
            source: true,
            bodyStructure: true,
            flags: true,
            uid: true,
          }
        );

        for await (const message of messages) {
          const envelope = message.envelope;
          if (!envelope) continue;

          // Check if message already exists by message ID
          const messageId = envelope.messageId;
          if (messageId) {
            const existing = EmailModel.findByUserId(userId, 'inbox');
            const alreadyExists = existing.some(
              (e) => e.message_id === messageId
            );
            if (alreadyExists) continue;
          }

          const fromAddress =
            envelope.from?.[0]
              ? `${envelope.from[0].name ?? ''} <${envelope.from[0].address ?? ''}>`
              : 'unknown';

          const toAddresses = (envelope.to ?? []).map(
            (addr) => addr.address ?? ''
          );

          const ccAddresses = (envelope.cc ?? []).map(
            (addr) => addr.address ?? ''
          );

          const sourceBuffer = message.source;
          const bodyText = sourceBuffer
            ? sourceBuffer.toString('utf-8')
            : '';

          const emailInput: CreateEmailInput = {
            user_id: userId,
            message_id: messageId ?? undefined,
            from_address: fromAddress,
            to_addresses: toAddresses,
            cc_addresses: ccAddresses,
            subject: envelope.subject ?? '(no subject)',
            body_text: bodyText,
            body_html: '',
            folder: 'inbox',
            received_at: envelope.date?.toISOString(),
            size_bytes: sourceBuffer?.length ?? 0,
          };

          EmailModel.create(emailInput);
          syncedCount++;
        }

        logger.info('Inbox sync completed', { userId, syncedCount });
      } finally {
        lock.release();
      }
    } catch (error) {
      logger.error('Inbox sync failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    return syncedCount;
  },

  async startIDLE(
    userId: string,
    onNewMail: (userId: string) => void | Promise<void>,
    config?: ImapConfig
  ): Promise<void> {
    const client = await ImapService.connectIMAP(userId, config);

    try {
      const lock = await client.getMailboxLock('INBOX');

      client.on('exists', async (data: { path: string; count: number; prevCount: number }) => {
        logger.info('New mail detected via IDLE', {
          userId,
          count: data.count,
          prevCount: data.prevCount,
        });
        try {
          await onNewMail(userId);
        } catch (error) {
          logger.error('Error handling new mail notification', {
            userId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

      // Keep the lock alive — IDLE is maintained automatically by ImapFlow
      // The lock prevents other operations on the mailbox
      logger.info('IMAP IDLE started', { userId });

      // Store cleanup function
      const cleanup = (): void => {
        lock.release();
        logger.info('IMAP IDLE stopped', { userId });
      };

      // Handle disconnect
      client.on('close', cleanup);
    } catch (error) {
      logger.error('Failed to start IDLE', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },

  async disconnectIMAP(userId: string): Promise<void> {
    const client = activeConnections.get(userId);
    if (client) {
      try {
        await client.logout();
      } catch {
        // Client may already be disconnected
      }
      activeConnections.delete(userId);
      logger.info('IMAP disconnected', { userId });
    }
  },

  getActiveConnectionCount(): number {
    return activeConnections.size;
  },
};
