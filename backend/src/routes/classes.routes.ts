import { Router } from 'express';
import * as ClassesController from '@/controllers/classes.controller';
import { requireAuth } from '@/middleware/auth';

export const classesRoutes = Router();

classesRoutes.get('/available/', requireAuth, ClassesController.listAvailableClasses);
classesRoutes.post('/register/', requireAuth, ClassesController.registerForClass);
classesRoutes.get('/my-classes/', requireAuth, ClassesController.listStudentClasses);
classesRoutes.get('/student/', requireAuth, ClassesController.listStudentClasses);
classesRoutes.get('/teacher/', requireAuth, ClassesController.listTeacherClasses);
classesRoutes.get('/materials/', requireAuth, ClassesController.getStudyMaterials);
