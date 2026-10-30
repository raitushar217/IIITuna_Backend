import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import { env } from '@/config/db';
import * as ClassesController from '@/controllers/classes.controller';
import { requireAuth } from '@/middleware/auth';
import { requireTeacher } from '@/middleware/roles';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve(process.cwd(), env.UPLOAD_DIR));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `notes-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
});

export const classesRoutes = Router();

classesRoutes.get('/available/', requireAuth, ClassesController.listAvailableClasses);
classesRoutes.post('/register/', requireAuth, ClassesController.registerForClass);
classesRoutes.get('/my-classes/', requireAuth, ClassesController.listStudentClasses);
classesRoutes.get('/student/', requireAuth, ClassesController.listStudentClasses);
classesRoutes.get('/teacher/', requireAuth, ClassesController.listTeacherClasses);
classesRoutes.get('/materials/', requireAuth, ClassesController.getStudyMaterials);
classesRoutes.post(
  '/materials/',
  requireAuth,
  requireTeacher,
  upload.single('file'),
  ClassesController.uploadStudyMaterial
);

