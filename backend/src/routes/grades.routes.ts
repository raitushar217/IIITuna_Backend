import { Router } from 'express';
import { requireAuth } from '@/middleware/auth';
import { requireStudent, requireTeacher } from '@/middleware/roles';
import * as GradesController from '@/controllers/grades.controller';

export const gradeRoutes = Router();

// Student: Only view their own grades for registered subjects
gradeRoutes.get('/student/', requireAuth, requireStudent, GradesController.getStudentGrades);

// Teacher: View grades of students in their subject
gradeRoutes.get('/subject/:subjectCode', requireAuth, requireTeacher, GradesController.getSubjectGradesForTeacher);

// Teacher: Edit / update marks for a student in their subject (real-time updates)
gradeRoutes.put('/subject/:subjectCode/student/:studentId', requireAuth, requireTeacher, GradesController.updateStudentGrade);
