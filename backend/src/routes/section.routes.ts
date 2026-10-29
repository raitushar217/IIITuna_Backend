import { Router } from 'express';
import * as SectionController from '@/controllers/section.controller';

export const sectionRoutes = Router();

sectionRoutes.get('/', SectionController.listSections);
sectionRoutes.post('/', SectionController.createSection);
