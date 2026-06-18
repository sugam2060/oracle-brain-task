import { Router } from 'express';
import { LeadController } from '../controllers/lead.controller';
import { validate } from '../middlewares/validate.middleware';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import { createLeadSchema, updateLeadSchema, getLeadsQuerySchema } from '../schemas/lead.schema';

const router = Router();

router.use(requireAuth);

router.post('/', requireRole(['ADMIN', 'SALES']), validate(createLeadSchema), LeadController.createLead);
router.get('/', requireRole(['ADMIN', 'SALES']), validate(getLeadsQuerySchema), LeadController.getLeads);
router.get('/:id', requireRole(['ADMIN', 'SALES']), LeadController.getLeadById);
router.patch('/:id', requireRole(['ADMIN']), validate(updateLeadSchema), LeadController.updateLead);
router.delete('/:id', requireRole(['ADMIN']), LeadController.deleteLead);

export default router;
