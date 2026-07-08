import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';

export interface Email {
  id: string;
  user_id: string;
  message_id: string | null;
  from_address: string;
  to_addresses: string;
  cc_addresses: string;
  bcc_addresses: string;
  subject: string;
  body_text: string;
  body_html: string;
  folder: string;
  is_read: number;
  is_starred: number;
  labels: string;
  is_draft: number;
  is_encrypted: number;
  in_reply_to: string | null;
  thread_id: string | null;
  size_bytes: number;
  received_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEmailInput {
  user_id: string;
  message_id?: string;
  from_address: string;
  to_addresses: string | string[];
  cc_addresses?: string | string[];
  bcc_addresses?: string | string[];
  subject?: string;
  body_text?: string;
  body_html?: string;
  folder?: string;
  is_draft?: boolean;
  is_encrypted?: boolean;
  in_reply_to?: string;
  thread_id?: string;
  size_bytes?: number;
  received_at?: string;
}

export interface UpdateEmailInput {
  is_read?: boolean;
  is_starred?: boolean;
  labels?: string[];
  folder?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

function serializeAddresses(addresses: string | string[] | undefined): string {
  if (!addresses) return '[]';
  if (typeof addresses === 'string') return addresses;
  return JSON.stringify(addresses);
}

export const EmailModel = {
  create(input: CreateEmailInput): Email {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO emails (
        id, user_id, message_id, from_address, to_addresses,
        cc_addresses, bcc_addresses, subject, body_text, body_html,
        folder, is_draft, is_encrypted, in_reply_to, thread_id,
        size_bytes, received_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.user_id,
      input.message_id ?? null,
      input.from_address,
      serializeAddresses(input.to_addresses),
      serializeAddresses(input.cc_addresses),
      serializeAddresses(input.bcc_addresses),
      input.subject ?? '',
      input.body_text ?? '',
      input.body_html ?? '',
      input.folder ?? 'inbox',
      input.is_draft ? 1 : 0,
      input.is_encrypted ? 1 : 0,
      input.in_reply_to ?? null,
      input.thread_id ?? null,
      input.size_bytes ?? 0,
      input.received_at ?? now,
      now,
      now
    );

    return EmailModel.findById(id)!;
  },

  findByUserId(
    userId: string,
    folder?: string,
    pagination?: PaginationOptions
  ): Email[] {
    const db = getDb();
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 50;
    const offset = (page - 1) * limit;

    if (folder) {
      const stmt = db.prepare(`
        SELECT * FROM emails
        WHERE user_id = ? AND folder = ?
        ORDER BY received_at DESC
        LIMIT ? OFFSET ?
      `);
      return stmt.all(userId, folder, limit, offset) as Email[];
    }

    const stmt = db.prepare(`
      SELECT * FROM emails
      WHERE user_id = ?
      ORDER BY received_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(userId, limit, offset) as Email[];
  },

  findById(id: string): Email | undefined {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM emails WHERE id = ?');
    return stmt.get(id) as Email | undefined;
  },

  update(id: string, input: UpdateEmailInput): boolean {
    const db = getDb();
    const now = new Date().toISOString();
    const sets: string[] = [];
    const values: unknown[] = [];

    if (input.is_read !== undefined) {
      sets.push('is_read = ?');
      values.push(input.is_read ? 1 : 0);
    }

    if (input.is_starred !== undefined) {
      sets.push('is_starred = ?');
      values.push(input.is_starred ? 1 : 0);
    }

    if (input.labels !== undefined) {
      sets.push('labels = ?');
      values.push(JSON.stringify(input.labels));
    }

    if (input.folder !== undefined) {
      sets.push('folder = ?');
      values.push(input.folder);
    }

    if (sets.length === 0) return false;

    sets.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE emails SET ${sets.join(', ')} WHERE id = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0;
  },

  delete(id: string): boolean {
    const db = getDb();
    const stmt = db.prepare('DELETE FROM emails WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  countByFolder(userId: string, folder: string): number {
    const db = getDb();
    const stmt = db.prepare(
      'SELECT COUNT(*) as count FROM emails WHERE user_id = ? AND folder = ?'
    );
    const row = stmt.get(userId, folder) as { count: number };
    return row.count;
  },
};
