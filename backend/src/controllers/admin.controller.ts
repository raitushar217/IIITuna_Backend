import { RequestHandler } from 'express';
import * as AdminService from '@/services/admin.service';

export const getStats: RequestHandler = async (_req, res) => {
  const stats = await AdminService.getAdminStats();
  res.json({ ok: true, data: stats });
};

export const getCurriculum: RequestHandler = async (req, res) => {
  const branch = req.query.branch as string | undefined;
  const semester = req.query.semester ? parseInt(req.query.semester as string, 10) : undefined;
  const data = await AdminService.getCurriculum(branch, semester);
  res.json({ ok: true, data });
};

export const getStudents: RequestHandler = async (req, res) => {
  const branch = req.query.branch as string | undefined;
  const semester = req.query.semester ? parseInt(req.query.semester as string, 10) : undefined;
  const stream = req.query.stream as string | undefined;
  const search = req.query.search as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;

  const result = await AdminService.getStudentsList({
    branch,
    semester,
    stream,
    search,
    limit,
    page,
  });
  res.json({ ok: true, ...result });
};

export const getTeachers: RequestHandler = async (_req, res) => {
  const teachers = await AdminService.getTeachersList();
  res.json({ ok: true, data: teachers });
};

export const getDefaulters: RequestHandler = async (req, res) => {
  const threshold = req.query.threshold ? parseInt(req.query.threshold as string, 10) : 75;
  const data = await AdminService.getAttendanceDefaulters(threshold);
  res.json({ ok: true, ...data });
};

export const lockStream: RequestHandler = async (req, res) => {
  const { student_id, stream_name } = req.body;
  if (!student_id || !stream_name) {
    return res.status(400).json({ ok: false, message: 'student_id and stream_name are required' });
  }
  const result = await AdminService.lockStudentStream(student_id, stream_name);
  res.json({ ok: true, ...result });
};

export const getIncidents: RequestHandler = async (_req, res) => {
  const incidents = await AdminService.getProctoringIncidents();
  res.json({ ok: true, data: incidents });
};

export const updateIncident: RequestHandler = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;
  if (!status || !['reviewed', 'penalized', 'dismissed'].includes(status)) {
    return res.status(400).json({ ok: false, message: 'Valid status required: reviewed, penalized, dismissed' });
  }
  const updated = await AdminService.updateIncidentStatus(id, status);
  res.json({ ok: true, data: updated });
};

