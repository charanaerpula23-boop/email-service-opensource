import { Router, type Request, type Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth.js';
import { EmailService } from '../services/email.service.js';
import { EmailModel } from '../models/email.model.js';
import { queue } from '../services/queue.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

// All email routes require authentication
router.use(authMiddleware);

// Validation rules
const sendEmailValidation = [
  body('to')
    .isArray({ min: 1 })
    .withMessage('At least one recipient is required'),
  body('to.*')
    .isEmail()
    .withMessage('Each recipient must be a valid email address'),
  body('cc')
    .optional()
    .isArray()
    .withMessage('CC must be an array'),
  body('cc.*')
    .optional()
    .isEmail()
    .withMessage('Each CC must be a valid email address'),
  body('bcc')
    .optional()
    .isArray()
    .withMessage('BCC must be an array'),
  body('bcc.*')
    .optional()
    .isEmail()
    .withMessage('Each BCC must be a valid email address'),
  body('subject')
    .isString()
    .isLength({ max: 998 })
    .withMessage('Subject must be a string under 998 characters'),
  body('bodyText')
    .optional()
    .isString()
    .withMessage('Body text must be a string'),
  body('bodyHtml')
    .optional()
    .isString()
    .withMessage('Body HTML must be a string'),
  body('inReplyTo')
    .optional()
    .isString(),
  body('threadId')
    .optional()
    .isString(),
];

const updateEmailValidation = [
  param('id')
    .isString()
    .notEmpty()
    .withMessage('Email ID is required'),
  body('is_read')
    .optional()
    .isBoolean()
    .withMessage('is_read must be a boolean'),
  body('is_starred')
    .optional()
    .isBoolean()
    .withMessage('is_starred must be a boolean'),
  body('labels')
    .optional()
    .isArray()
    .withMessage('labels must be an array'),
  body('folder')
    .optional()
    .isString()
    .withMessage('folder must be a string'),
];

// GET /api/emails — List emails with optional folder filter and pagination
router.get(
  '/',
  [
    query('folder').optional().isString(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  (req: Request, res: Response): void => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user!.userId;
      const folder = req.query.folder as string | undefined;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 50;

      const result = EmailService.getEmailsForUser(userId, folder, page, limit);

      res.set('X-Total-Count', String(result.total));
      res.set('X-Page', String(result.page));
      res.set('X-Limit', String(result.limit));

      res.json(result);
    } catch (error) {
      logger.error('Get emails error', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/emails/:id — Get single email
router.get(
  '/:id',
  [param('id').isString().notEmpty()],
  (req: Request, res: Response): void => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user!.userId;
      const emailId = String(req.params.id);

      const email = EmailService.getEmailById(emailId, userId);
      if (!email) {
        res.status(404).json({ error: 'Email not found' });
        return;
      }

      // Mark as read when fetched
      if (!email.is_read) {
        EmailModel.update(emailId, { is_read: true });
      }

      res.json(email);
    } catch (error) {
      logger.error('Get email error', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/emails/send — Send an email (queued)
router.post(
  '/send',
  sendEmailValidation,
  (req: Request, res: Response): void => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user!.userId;
      const { to, cc, bcc, subject, bodyText, bodyHtml, inReplyTo, threadId } =
        req.body as {
          to: string[];
          cc?: string[];
          bcc?: string[];
          subject: string;
          bodyText?: string;
          bodyHtml?: string;
          inReplyTo?: string;
          threadId?: string;
        };

      // Enqueue the send job
      const jobId = queue.enqueue('sendEmail', {
        userId,
        to,
        cc,
        bcc,
        subject,
        bodyText,
        bodyHtml,
        inReplyTo,
        threadId,
      });

      logger.info('Email send job enqueued', { userId, jobId });

      res.status(202).json({
        message: 'Email queued for sending',
        jobId,
      });
    } catch (error) {
      logger.error('Send email error', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/emails/draft — Save a draft
router.post(
  '/draft',
  sendEmailValidation,
  (req: Request, res: Response): void => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user!.userId;
      const { to, cc, bcc, subject, bodyText, bodyHtml, inReplyTo, threadId } =
        req.body as {
          to: string[];
          cc?: string[];
          bcc?: string[];
          subject: string;
          bodyText?: string;
          bodyHtml?: string;
          inReplyTo?: string;
          threadId?: string;
        };

      const draft = EmailService.saveDraft({
        userId,
        to,
        cc,
        bcc,
        subject,
        bodyText,
        bodyHtml,
        inReplyTo,
        threadId,
      });

      res.status(201).json(draft);
    } catch (error) {
      logger.error('Save draft error', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/emails/:id — Move to trash or permanently delete
router.delete(
  '/:id',
  [
    param('id').isString().notEmpty(),
    query('permanent').optional().isBoolean().toBoolean(),
  ],
  (req: Request, res: Response): void => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user!.userId;
      const emailId = String(req.params.id);
      const permanent = String(req.query.permanent ?? '') === 'true';

      let success: boolean;
      if (permanent) {
        success = EmailService.permanentDelete(emailId, userId);
      } else {
        success = EmailService.moveToTrash(emailId, userId);
      }

      if (!success) {
        res.status(404).json({ error: 'Email not found' });
        return;
      }

      res.json({
        message: permanent
          ? 'Email permanently deleted'
          : 'Email moved to trash',
      });
    } catch (error) {
      logger.error('Delete email error', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PATCH /api/emails/:id — Update email flags/labels/folder
router.patch(
  '/:id',
  updateEmailValidation,
  (req: Request, res: Response): void => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user!.userId;
      const emailId = String(req.params.id);

      // Verify ownership
      const email = EmailService.getEmailById(emailId, userId);
      if (!email) {
        res.status(404).json({ error: 'Email not found' });
        return;
      }

      const { is_read, is_starred, labels, folder } = req.body as {
        is_read?: boolean;
        is_starred?: boolean;
        labels?: string[];
        folder?: string;
      };

      const updated = EmailModel.update(String(emailId), {
        is_read,
        is_starred,
        labels,
        folder,
      });

      if (!updated) {
        res.status(400).json({ error: 'No changes applied' });
        return;
      }

      const updatedEmail = EmailModel.findById(String(emailId));
      res.json(updatedEmail);
    } catch (error) {
      logger.error('Update email error', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
