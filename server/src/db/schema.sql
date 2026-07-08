-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    public_key TEXT,
    imap_host TEXT,
    imap_port INTEGER DEFAULT 993,
    imap_user TEXT,
    imap_pass_encrypted TEXT,
    smtp_host TEXT,
    smtp_port INTEGER DEFAULT 587,
    smtp_user TEXT,
    smtp_pass_encrypted TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Emails table
CREATE TABLE IF NOT EXISTS emails (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    message_id TEXT,
    from_address TEXT NOT NULL,
    to_addresses TEXT NOT NULL,
    cc_addresses TEXT DEFAULT '[]',
    bcc_addresses TEXT DEFAULT '[]',
    subject TEXT NOT NULL DEFAULT '',
    body_text TEXT DEFAULT '',
    body_html TEXT DEFAULT '',
    folder TEXT NOT NULL DEFAULT 'inbox',
    is_read INTEGER NOT NULL DEFAULT 0,
    is_starred INTEGER NOT NULL DEFAULT 0,
    labels TEXT DEFAULT '[]',
    is_draft INTEGER NOT NULL DEFAULT 0,
    is_encrypted INTEGER NOT NULL DEFAULT 0,
    in_reply_to TEXT,
    thread_id TEXT,
    size_bytes INTEGER DEFAULT 0,
    received_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Attachments table
CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY NOT NULL,
    email_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    size_bytes INTEGER NOT NULL DEFAULT 0,
    content_id TEXT,
    is_inline INTEGER NOT NULL DEFAULT 0,
    storage_path TEXT NOT NULL,
    checksum TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    is_revoked INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    revoked_at TEXT,
    replaced_by TEXT,
    user_agent TEXT,
    ip_address TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Public keys table (for PGP key exchange)
CREATE TABLE IF NOT EXISTS public_keys (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    public_key TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    algorithm TEXT NOT NULL DEFAULT 'RSA-2048',
    expires_at TEXT,
    is_revoked INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_folder ON emails(user_id, folder);
CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails(message_id);
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at);
CREATE INDEX IF NOT EXISTS idx_attachments_email_id ON attachments(email_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_public_keys_user_id ON public_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_public_keys_email ON public_keys(email);
CREATE INDEX IF NOT EXISTS idx_public_keys_fingerprint ON public_keys(fingerprint);
