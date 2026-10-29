import { Router } from 'express';
import { requireAuth } from '@/middleware/auth';
import { requireStudent, requireTeacher } from '@/middleware/roles';
import * as AttendanceController from '@/controllers/attendance.controller';

export const attendanceRoutes = Router();

// Student: View own attendance across registered subjects
attendanceRoutes.get('/student/', requireAuth, requireStudent, AttendanceController.getStudentAttendance);

// Teacher: View session logs for a subject
attendanceRoutes.get('/subject/:subjectCode/sessions', requireAuth, requireTeacher, AttendanceController.getTeacherSessions);

// Teacher: View enrolled students roster with attendance %
attendanceRoutes.get('/subject/:subjectCode/students', requireAuth, requireTeacher, AttendanceController.getEnrolledStudents);

// Teacher: Mark & record a new attendance lecture session
attendanceRoutes.post('/subject/:subjectCode/session', requireAuth, requireTeacher, AttendanceController.recordSession);
