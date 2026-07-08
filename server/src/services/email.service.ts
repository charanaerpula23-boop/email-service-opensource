import nodemailer from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer/index.js';
import { EmailModel, type CreateEmailInput, type Email } from '../models/email.model.js';
import { UserModel } from '../models/user.model.js';
import { CryptoService } from './crypto.service.js';
import { logger } from '../utils/logger.js';

function getSmtpTransport(): nodemailer.Transporter {
  const dkimConfig = CryptoService.getDKIMConfig();

  const transportOptions: Record<string, unknown> = {
    host: process.env.SMTP_HOST ?? 'localhost',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER ?? '',
      pass: process.env.SMTP_PASS ?? '',
    },
  };

  if (dkimConfig) {
    transportOptions.dkim = dkimConfig;
  }

  return nodemailer.createTransport(transportOptions as nodemailer.TransportOptions);
}

export interface SendEmailInput {
  userId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  inReplyTo?: string;
  threadId?: string;
}

export const EmailService = {
  async sendEmail(input: SendEmailInput): Promise<Email> {
    const user = UserModel.findById(input.userId);
    if (!user) {
      throw new Error('User not found');
    }

    const transport = getSmtpTransport();

    const mailOptions: Mail.Options = {
      from: user.email,
      to: input.to.join(', '),
      cc: input.cc?.join(', '),
      bcc: input.bcc?.join(', '),
      subject: input.subject,
      text: input.bodyText,
      html: input.bodyHtml,
      inReplyTo: input.inReplyTo,
      headers: input.threadId
        ? { 'X-Thread-ID': input.threadId }
        : undefined,
    };

    let messageId: string | undefined;
    try {
      const info = await transport.sendMail(mailOptions);
      messageId = info.messageId;
      logger.info('Email sent successfully', {
        userId: input.userId,
        messageId,
        to: input.to,
      });
    } catch (error) {
      logger.error('Failed to send email', {
        userId: input.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      transport.close();
    }

    // Save to sent folder
    const emailInput: CreateEmailInput = {
      user_id: input.userId,
      message_id: messageId,
      from_address: user.email,
      to_addresses: input.to,
      cc_addresses: input.cc,
      bcc_addresses: input.bcc,
      subject: input.subject,
      body_text: input.bodyText,
      body_html: input.bodyHtml,
      folder: 'sent',
      in_reply_to: input.inReplyTo,
      thread_id: input.threadId,
      size_bytes:
        (input.bodyText?.length ?? 0) + (input.bodyHtml?.length ?? 0),
    };

    return EmailModel.create(emailInput);
  },

  saveDraft(input: SendEmailInput): Email {
    const user = UserModel.findById(input.userId);
    if (!user) {
      throw new Error('User not found');
    }

    const emailInput: CreateEmailInput = {
      user_id: input.userId,
      from_address: user.email,
      to_addresses: input.to,
      cc_addresses: input.cc,
      bcc_addresses: input.bcc,
      subject: input.subject,
      body_text: input.bodyText,
      body_html: input.bodyHtml,
      folder: 'drafts',
      is_draft: true,
      in_reply_to: input.inReplyTo,
      thread_id: input.threadId,
      size_bytes:
        (input.bodyText?.length ?? 0) + (input.bodyHtml?.length ?? 0),
    };

    logger.info('Draft saved', { userId: input.userId });
    return EmailModel.create(emailInput);
  },

  moveToTrash(emailId: string, userId: string): boolean {
    const email = EmailModel.findById(emailId);
    if (!email || email.user_id !== userId) {
      return false;
    }

    const result = EmailModel.update(emailId, { folder: 'trash' });
    if (result) {
      logger.info('Email moved to trash', { emailId, userId });
    }
    return result;
  },

  permanentDelete(emailId: string, userId: string): boolean {
    const email = EmailModel.findById(emailId);
    if (!email || email.user_id !== userId) {
      return false;
    }

    const result = EmailModel.delete(emailId);
    if (result) {
      logger.info('Email permanently deleted', { emailId, userId });
    }
    return result;
  },

  getEmailsForUser(
    userId: string,
    folder?: string,
    page = 1,
    limit = 50
  ): { emails: Email[]; total: number; page: number; limit: number } {
    const emails = EmailModel.findByUserId(userId, folder, { page, limit });
    const total = folder
      ? EmailModel.countByFolder(userId, folder)
      : EmailModel.findByUserId(userId).length;

    return { emails, total, page, limit };
  },

  getEmailById(emailId: string, userId: string): Email | null {
    const email = EmailModel.findById(emailId);
    if (!email || email.user_id !== userId) {
      return null;
    }
    return email;
  },
};
