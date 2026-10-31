import { Router } from 'express';
import * as AdminController from '@/controllers/admin.controller';
import { requireAuth } from '@/middleware/auth';

export const adminRoutes = Router();

// Public/demo accessible stats & curriculum
adminRoutes.get('/stats', AdminController.getStats);
adminRoutes.get('/curriculum', AdminController.getCurriculum);

// Admin-managed endpoints
adminRoutes.get('/students', AdminController.getStudents);
adminRoutes.get('/teachers', AdminController.getTeachers);
adminRoutes.get('/attendance/defaulters', AdminController.getDefaulters);
adminRoutes.post('/streams/lock', AdminController.lockStream);
adminRoutes.get('/proctoring/incidents', AdminController.getIncidents);
adminRoutes.patch('/proctoring/incidents/:id', AdminController.updateIncident);
