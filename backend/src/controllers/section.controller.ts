import type { RequestHandler } from 'express';
import { HttpError } from '@/utils/httpError';
import * as SectionService from '@/services/section.service';

export const listSections: RequestHandler = async (_req, res) => {
  const sections = await SectionService.listSections();
  res.json(sections);
};

export const createSection: RequestHandler = async (req, res) => {
  const code = req.body?.code;
  const name = req.body?.name;

  if (code === undefined || name === undefined) {
    throw new HttpError(400, 'Validation error', {
      code: code === undefined ? ['This field is required.'] : undefined,
      name: name === undefined ? ['This field is required.'] : undefined,
    });
  }

  const section = await SectionService.createSection({ code, name });
  res.status(201).json(section);
};
