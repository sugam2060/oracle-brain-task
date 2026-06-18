import prisma from '../prisma/prisma.client';
import { Prisma } from '@prisma/client';

export class LeadService {
  static async createLead(data: any, assignedToId: string) {
    const existingLead = await prisma.lead.findUnique({ where: { email: data.email } });
    if (existingLead && !existingLead.isDeleted) {
      throw { status: 409, message: 'Lead with this email already exists' };
    }

    if (existingLead && existingLead.isDeleted) {
        return await prisma.lead.update({
            where: { email: data.email },
            data: { ...data, assignedToId, isDeleted: false },
        });
    }

    return await prisma.lead.create({
      data: {
        ...data,
        assignedToId,
      },
    });
  }

  static async getLeads(filters: any, user: { userId: string, role: string }) {
    const { page = 1, limit = 10, status, search, export: isExport } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.LeadWhereInput = {
      isDeleted: false,
    };

    if (user.role === 'SALES') {
      where.assignedToId = user.userId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isExport === 'true') {
      return await prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' } });
    }

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, page, limit, totalPages: Math.ceil(total / limit), leads };
  }

  static async getLeadById(id: string, user: { userId: string, role: string }) {
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead || lead.isDeleted) {
      throw { status: 404, message: 'Lead not found' };
    }

    if (user.role === 'SALES' && lead.assignedToId !== user.userId) {
      throw { status: 403, message: 'Forbidden: You can only view your own leads' };
    }

    return lead;
  }

  static async updateLead(id: string, data: any, user: { userId: string, role: string }) {
    const lead = await this.getLeadById(id, user); 

    if (data.email && data.email !== lead.email) {
      const existing = await prisma.lead.findUnique({ where: { email: data.email } });
      if (existing) throw { status: 409, message: 'Lead with this email already exists' };
    }

    return await prisma.lead.update({
      where: { id },
      data,
    });
  }

  static async deleteLead(id: string, user: { userId: string, role: string }) {
    await this.getLeadById(id, user);

    await prisma.lead.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
