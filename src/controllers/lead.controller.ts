import { Request, Response, NextFunction } from 'express';
import { LeadService } from '../services/lead.service';
import { streamCsvToResponse } from '../utils/csv.util';

export class LeadController {
  static async createLead(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const assignedToId = req.body.assignedToId || user.userId; 
      
      if (user.role === 'SALES' && assignedToId !== user.userId) {
        res.status(403).json({ success: false, message: 'Forbidden: Sales can only create leads assigned to themselves' });
        return;
      }

      const { name, email, phone, company, notes, status } = req.body;
      const leadData = { name, email, phone, company, notes, status };

      const lead = await LeadService.createLead(leadData, assignedToId);
      res.status(201).json({ success: true, data: lead });
    } catch (error) {
      next(error);
    }
  }

  static async getLeads(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await LeadService.getLeads(req.query, req.user!);
      
      if (req.query.export === 'true') {
        const filename = `leads_export_${new Date().toISOString()}.csv`;
        return streamCsvToResponse(result as any[], res, filename);
      }

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getLeadById(req: Request, res: Response, next: NextFunction) {
    try {
      const lead = await LeadService.getLeadById(req.params.id as string, req.user!);
      res.status(200).json({ success: true, data: lead });
    } catch (error) {
      next(error);
    }
  }

  static async updateLead(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, phone, company, notes, status } = req.body;
      
      // Only pass fields that are explicitly provided
      const leadData: any = { name, email, phone, company, notes, status };
      Object.keys(leadData).forEach(key => leadData[key] === undefined && delete leadData[key]);

      const lead = await LeadService.updateLead(req.params.id as string, leadData, req.user!);
      res.status(200).json({ success: true, data: lead });
    } catch (error) {
      next(error);
    }
  }

  static async deleteLead(req: Request, res: Response, next: NextFunction) {
    try {
      await LeadService.deleteLead(req.params.id as string, req.user!);
      res.status(200).json({ success: true, message: 'Lead soft deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}
