import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  public_key: string | null;
  imap_host: string | null;
  imap_port: number;
  imap_user: string | null;
  imap_pass_encrypted: string | null;
  smtp_host: string | null;
  smtp_port: number;
  smtp_user: string | null;
  smtp_pass_encrypted: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  email: string;
  password_hash: string;
  display_name?: string;
}

export const UserModel = {
  create(input: CreateUserInput): User {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();
    const displayName = input.display_name ?? '';

    const stmt = db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, input.email, input.password_hash, displayName, now, now);

    return UserModel.findById(id)!;
  },

  findByEmail(email: string): User | undefined {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email) as User | undefined;
  },

  findById(id: string): User | undefined {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as User | undefined;
  },

  updatePublicKey(userId: string, publicKey: string): boolean {
    const db = getDb();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE users SET public_key = ?, updated_at = ? WHERE id = ?
    `);
    const result = stmt.run(publicKey, now, userId);
    return result.changes > 0;
  },

  updatePassword(userId: string, passwordHash: string): boolean {
    const db = getDb();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?
    `);
    const result = stmt.run(passwordHash, now, userId);
    return result.changes > 0;
  },
};
