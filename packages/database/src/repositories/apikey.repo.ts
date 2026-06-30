import { prisma } from '../client';
import { ApiKey } from '@prisma/client';
import crypto from 'crypto';

export class ApiKeyRepository {
  async create(projectId: string): Promise<{ key: string; apiKey: ApiKey }> {
    const rawKey = `uni_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const prefix = rawKey.substring(0, 12);

    const apiKey = await prisma.apiKey.create({
      data: {
        projectId,
        keyHash,
        prefix,
      },
    });

    return { key: rawKey, apiKey };
  }

  async findByHash(keyHash: string): Promise<ApiKey | null> {
    return prisma.apiKey.findUnique({
      where: { keyHash },
      include: { project: true } as any,
    });
  }

  /**
   * Atomically deduct compute units from an API key.
   * Uses a conditional update to ensure we never go below 0.
   * Returns the updated ApiKey or null if insufficient units.
   */
  async deductComputeUnits(
    keyHash: string,
    units: number
  ): Promise<ApiKey | null> {
    const [updateResult, updatedKey] = await prisma.$transaction([
      prisma.apiKey.updateMany({
        where: {
          keyHash,
          computeUnits: { gte: units },
        },
        data: {
          computeUnits: { decrement: units },
        },
      }),
      prisma.apiKey.findUnique({
        where: { keyHash },
      }),
    ]);

    if (updateResult.count === 0) return null;
    return updatedKey;
  }

  async getComputeUnits(keyHash: string): Promise<number | null> {
    const key = await prisma.apiKey.findUnique({
      where: { keyHash },
      select: { computeUnits: true },
    });
    return key ? key.computeUnits : null;
  }
}
