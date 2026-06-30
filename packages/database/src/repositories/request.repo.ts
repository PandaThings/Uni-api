import { prisma } from '../client';
import { Request } from '@prisma/client';

export class RequestRepository {
  async create(data: Omit<Request, 'id' | 'createdAt' | 'repaired'> & { repaired?: boolean }): Promise<Request> {
    return prisma.request.create({
      data,
    });
  }

  async findByProject(projectId: string, limit: number = 50): Promise<Request[]> {
    return prisma.request.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
