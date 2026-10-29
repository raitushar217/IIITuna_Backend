import type { RequestHandler } from 'express';
import * as AttendanceService from '@/services/attendance.service';

export const getStudentAttendance: RequestHandler = async (req, res) => {
  const summaries = await AttendanceService.getStudentAttendanceSummary(req.auth!.user);
  res.json(summaries);
};

export const getTeacherSessions: RequestHandler = async (req, res) => {
  const subjectCode = req.params.subjectCode;
  const sessions = await AttendanceService.getTeacherAttendanceSessions(req.auth!.user, subjectCode);
  res.json(sessions);
};

export const getEnrolledStudents: RequestHandler = async (req, res) => {
  const subjectCode = req.params.subjectCode;
  const students = await AttendanceService.getEnrolledStudentsForAttendance(req.auth!.user, subjectCode);
  res.json(students);
};

export const recordSession: RequestHandler = async (req, res) => {
  const subjectCode = req.params.subjectCode;
  const session = await AttendanceService.recordAttendanceSession(req.auth!.user, subjectCode, req.body);
  res.status(201).json(session);
};
