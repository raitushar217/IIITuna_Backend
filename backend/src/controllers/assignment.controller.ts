import type { RequestHandler } from 'express';
import { HttpError } from '@/utils/httpError';
import * as AssignmentsService from '@/services/assignments.service';

export const listAssignments: RequestHandler = async (req, res) => {
  const assignments = await AssignmentsService.listAssignments(req.auth!.user);
  res.json(assignments.map(AssignmentsService.assignmentToDjangoShape));
};

export const createAssignment: RequestHandler = async (req, res) => {
  const filePath = (req as any).file?.path;
  if (!filePath) throw new HttpError(400, 'Validation error', { assignment_pdf: ['This field is required.'] });

  const payload = await AssignmentsService.createAssignment({
    user: req.auth!.user,
    body: req.body,
    filePath,
  });
  res.status(201).json(payload);
};

export const listSubmissions: RequestHandler = async (req, res) => {
  const user = req.auth!.user;
  if (user.role === 'teacher') {
    const subs = await AssignmentsService.listSubmissionsForTeacher(user);
    return res.json(subs.map(AssignmentsService.submissionToDjangoShape));
  }
  if (user.role === 'student') {
    const subs = await AssignmentsService.listSubmissionsForStudent(user);
    return res.json(subs.map(AssignmentsService.submissionToDjangoShape));
  }
  return res.json([]);
};

export const createSubmission: RequestHandler = async (req, res) => {
  const filePath = (req as any).file?.path;
  if (!filePath) throw new HttpError(400, 'Validation error', { submission_pdf: ['This field is required.'] });

  const payload = await AssignmentsService.createSubmission({
    user: req.auth!.user,
    body: req.body,
    filePath,
  });
  res.status(201).json(payload);
};

export const getSubmissionsForAssignment: RequestHandler = async (req, res) => {
  const assignmentId = Number(req.params.id);
  const subs = await AssignmentsService.getSubmissionsForAssignment(req.auth!.user, assignmentId);
  res.json(subs.map(AssignmentsService.submissionToDjangoShape));
};

export const gradeSubmission: RequestHandler = async (req, res) => {
  const submissionId = Number(req.params.id);
  const graded = await AssignmentsService.gradeSubmission(req.auth!.user, submissionId, req.body);
  res.json(graded);
};


