import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import dns from 'node:dns/promises';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.get(
  '/verify',
  authMiddleware,
  [
    query('domain').isString().trim().notEmpty().withMessage('Domain is required'),
  ],
  async (req: any, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { domain } = req.query as { domain: string };
    
    const result = {
      mx: false,
      spf: false,
      dmarc: false,
      dkim: false
    };

    try {
      // Check MX
      try {
        const mxRecords = await dns.resolveMx(domain);
        result.mx = mxRecords && mxRecords.length > 0;
      } catch (e) {
        // MX not found
      }

      // Check SPF
      try {
        const txtRecords = await dns.resolveTxt(domain);
        result.spf = txtRecords.some(chunk => chunk.join('').includes('v=spf1'));
      } catch (e) {}

      // Check DMARC
      try {
        const dmarcRecords = await dns.resolveTxt(`_dmarc.${domain}`);
        result.dmarc = dmarcRecords.some(chunk => chunk.join('').includes('v=DMARC1'));
      } catch (e) {}

      // Check DKIM (using standard 'mail._domainkey' or 'default._domainkey')
      try {
        const dkimSelector = process.env.DKIM_SELECTOR || 'mail';
        const dkimRecords = await dns.resolveTxt(`${dkimSelector}._domainkey.${domain}`);
        result.dkim = dkimRecords.some(chunk => chunk.join('').includes('v=DKIM1'));
      } catch (e) {
        try {
          const dkimRecords2 = await dns.resolveTxt(`default._domainkey.${domain}`);
          result.dkim = result.dkim || dkimRecords2.some(chunk => chunk.join('').includes('v=DKIM1'));
        } catch(e2) {}
      }

      return res.json({ domain, result });
    } catch (err: any) {
      logger.error('DNS Verification failed', { error: err.message });
      return res.status(500).json({ message: 'DNS Verification failed', error: err.message });
    }
  }
);

export default router;
