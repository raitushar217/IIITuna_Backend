import { Router } from 'express';
import { requireAuth } from '@/middleware/auth';
import { requireTeacher } from '@/middleware/roles';
import * as NoticeController from '@/controllers/notice.controller';

export const noticeRoutes = Router();

noticeRoutes.get('/', requireAuth, NoticeController.listNotices);
noticeRoutes.post('/', requireAuth, requireTeacher, NoticeController.createNotice);

