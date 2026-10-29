import type { RequestHandler } from 'express';
import * as QuizzesService from '@/services/quizzes.service';

export const listQuizzes: RequestHandler = async (req, res) => {
  const quizzes = await QuizzesService.listQuizzes(req.auth!.user);
  res.json(quizzes.map(QuizzesService.quizToDjangoShape));
};

export const createQuiz: RequestHandler = async (req, res) => {
  const payload = await QuizzesService.createQuiz(req.auth!.user, req.body);
  res.status(201).json(payload);
};

export const startAttempt: RequestHandler = async (req, res) => {
  const payload = await QuizzesService.startAttempt(req.auth!.user, Number(req.params.id));
  res.json(payload);
};

export const submitAttempt: RequestHandler = async (req, res) => {
  const payload = await QuizzesService.submitAttempt(req.auth!.user, Number(req.params.id));
  res.json(payload);
};

export const listQuestions: RequestHandler = async (req, res) => {
  const questions = await QuizzesService.listQuestionsForTeacher(req.auth!.user);
  res.json(questions);
};

export const createQuestion: RequestHandler = async (req, res) => {
  const payload = await QuizzesService.createQuestion(req.body);
  res.status(201).json(payload);
};

export const listOptions: RequestHandler = async (req, res) => {
  const opts = await QuizzesService.listOptionsForTeacher(req.auth!.user);
  res.json(opts.map(QuizzesService.optionToDjangoShape));
};

export const createOption: RequestHandler = async (req, res) => {
  const payload = await QuizzesService.createOption(req.body);
  res.status(201).json(payload);
};

export const listSubmitted: RequestHandler = async (req, res) => {
  const attempts = await QuizzesService.listSubmittedAttempts(req.auth!.user);
  res.json(attempts.map(QuizzesService.attemptToDjangoShape));
};

export const getSubmitted: RequestHandler = async (req, res) => {
  const payload = await QuizzesService.getSubmittedAttempt(req.auth!.user, String(req.params.quiz_attempt_code));
  res.json(payload);
};

export const submitAnswer: RequestHandler = async (req, res) => {
  const payload = await QuizzesService.submitAnswer(req.auth!.user, req.body);
  res.status(201).json(payload);
};

export const getSubjectQuizzes: RequestHandler = async (req, res) => {
  const quizzes = await QuizzesService.getSubjectQuizzes(req.params.subjectCode);
  res.json(quizzes);
};

export const publishSubjectQuiz: RequestHandler = async (req, res) => {
  const payload = await QuizzesService.publishSubjectQuiz(req.auth!.user, req.body);
  res.status(201).json(payload);
};


