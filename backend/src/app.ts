import 'express-async-errors';
import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from '@/config/db';
import { errorHandler } from '@/middleware/errorHandler';
import { notFound } from '@/middleware/notFound';

import { userRoutes } from '@/routes/user.routes';
import { assignmentRoutes } from '@/routes/assignment.routes';
import { noticeRoutes } from '@/routes/notice.routes';
import { quizRoutes } from '@/routes/quiz.routes';
import { sectionRoutes } from '@/routes/section.routes';
import { classesRoutes } from '@/routes/classes.routes';
import { gradeRoutes } from '@/routes/grades.routes';
import { attendanceRoutes } from '@/routes/attendance.routes';

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors());
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  app.use(`/${env.UPLOAD_DIR}`, express.static(uploadDir));

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/users', userRoutes);
  app.use('/api/assignments', assignmentRoutes);
  app.use('/api/notices', noticeRoutes);
  app.use('/api/quizzes', quizRoutes);
  app.use('/api/sections', sectionRoutes);
  app.use('/api/classes', classesRoutes);
  app.use('/api/grades', gradeRoutes);
  app.use('/api/attendance', attendanceRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

