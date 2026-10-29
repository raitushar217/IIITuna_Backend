import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import { env } from '@/config/db';
import { requireAuth } from '@/middleware/auth';
import { requireStudent, requireTeacher } from '@/middleware/roles';
import * as AssignmentController from '@/controllers/assignment.controller';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve(process.cwd(), env.UPLOAD_DIR));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

export const assignmentRoutes = Router();

assignmentRoutes.get(['/', '/assignments/'], requireAuth, AssignmentController.listAssignments);
assignmentRoutes.post(
  ['/', '/assignments/'],
  requireAuth,
  requireTeacher,
  upload.single('assignment_pdf'),
  AssignmentController.createAssignment,
);

assignmentRoutes.get('/submissions/', requireAuth, AssignmentController.listSubmissions);
assignmentRoutes.get('/:id/submissions', requireAuth, requireTeacher, AssignmentController.getSubmissionsForAssignment);
assignmentRoutes.put('/submissions/:id/grade', requireAuth, requireTeacher, AssignmentController.gradeSubmission);
assignmentRoutes.post(
  '/submissions/',
  requireAuth,
  requireStudent,
  upload.single('submission_pdf'),
  AssignmentController.createSubmission,
);

