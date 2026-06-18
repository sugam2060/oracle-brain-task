import { z } from 'zod';

export const createLeadSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    company: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED']).optional(),
  }),
});

export const updateLeadSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').optional(),
    email: z.string().email('Invalid email address').optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED']).optional(),
  }),
});

export const getLeadsQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).optional().transform(Number),
    limit: z.string().regex(/^\d+$/).optional().transform(Number),
    status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED']).optional(),
    search: z.string().optional(),
    export: z.enum(['true', 'false']).optional(),
  }),
});
