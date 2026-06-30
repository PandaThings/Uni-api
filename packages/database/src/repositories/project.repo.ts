import { prisma } from '../client';
import { Project } from '@prisma/client';

export class ProjectRepository {
  async create(name: string, ownerId: string): Promise<Project> {
    return prisma.project.create({
      data: { name, ownerId },
    });
  }

  async findById(id: string): Promise<Project | null> {
    return prisma.project.findUnique({ where: { id } });
  }

  async findByOwner(ownerId: string): Promise<Project[]> {
    return prisma.project.findMany({ where: { ownerId } });
  }
}
