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

  const samplePdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 120 >>
stream
BT
/F1 18 Tf
72 700 Td
(IIIT Una - Course Assignment Document) Tj
0 -36 Td
/F1 12 Tf
(This is a sample assignment document.) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000414 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
485
%%EOF`;

  const demoPdfPath = path.join(uploadDir, 'demo_assignment.pdf');
  if (!fs.existsSync(demoPdfPath)) {
    try {
      fs.writeFileSync(demoPdfPath, samplePdfContent);
    } catch {
      // Ignore write errors
    }
  }

  app.use(`/${env.UPLOAD_DIR}`, express.static(uploadDir));
  app.use(`/${env.UPLOAD_DIR}`, (_req, res) => {
    if (fs.existsSync(demoPdfPath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.sendFile(demoPdfPath);
    } else {
      res.setHeader('Content-Type', 'application/pdf');
      res.send(Buffer.from(samplePdfContent));
    }
  });

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

