import type { RequestHandler } from 'express';
import * as GradesService from '@/services/grades.service';

export const getStudentGrades: RequestHandler = async (req, res) => {
  const cards = await GradesService.getStudentGrades(req.auth!.user);
  res.json(cards);
};

export const getSubjectGradesForTeacher: RequestHandler = async (req, res) => {
  const cards = await GradesService.getSubjectGradesForTeacher(req.auth!.user, req.params.subjectCode);
  res.json(cards);
};

export const updateStudentGrade: RequestHandler = async (req, res) => {
  const card = await GradesService.updateStudentGrade(
    req.auth!.user,
    req.params.subjectCode,
    req.params.studentId,
    req.body
  );
  res.json(card);
};
