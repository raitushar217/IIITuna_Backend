import { AppDataSource } from '@/config/db';
import { Section } from '@/entities/Section';
import { HttpError } from '@/utils/httpError';

export async function listSections() {
  const repo = AppDataSource.getRepository(Section);
  return repo.find({ order: { code: 'ASC' } });
}

export async function createSection(input: { code?: unknown; name?: unknown }) {
  const code = typeof input.code === 'string' ? input.code.trim() : '';
  const name = typeof input.name === 'string' ? input.name.trim() : '';

  if (!code) {
    throw new HttpError(400, 'Validation error', { code: ['This field is required.'] });
  }

  if (!name) {
    throw new HttpError(400, 'Validation error', { name: ['This field is required.'] });
  }

  const repo = AppDataSource.getRepository(Section);
  const existing = await repo.findOne({ where: { code } });
  if (existing) {
    throw new HttpError(409, 'Validation error', { code: ['Section with this code already exists.'] });
  }

  const section = repo.create({ code, name });
  await repo.save(section);
  return section;
}
