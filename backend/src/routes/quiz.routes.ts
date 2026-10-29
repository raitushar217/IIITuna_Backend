import { Router } from 'express';
import { requireAuth } from '@/middleware/auth';
import { requireStudent, requireTeacher } from '@/middleware/roles';
import * as QuizController from '@/controllers/quiz.controller';

export const quizRoutes = Router();

quizRoutes.get('/quizzes/', requireAuth, QuizController.listQuizzes);
quizRoutes.post('/quizzes/', requireAuth, requireTeacher, QuizController.createQuiz);
quizRoutes.post('/quizzes/:id/start_attempt/', requireAuth, requireStudent, QuizController.startAttempt);
quizRoutes.post('/quizzes/:id/submit_attempt/', requireAuth, requireStudent, QuizController.submitAttempt);

quizRoutes.post('/answers/', requireAuth, requireStudent, QuizController.submitAnswer);
quizRoutes.get('/questions/', requireAuth, requireTeacher, QuizController.listQuestions);
quizRoutes.post('/questions/', requireAuth, requireTeacher, QuizController.createQuestion);
quizRoutes.get('/options/', requireAuth, requireTeacher, QuizController.listOptions);
quizRoutes.post('/options/', requireAuth, requireTeacher, QuizController.createOption);

quizRoutes.get('/submitted-quizzes/', requireAuth, requireStudent, QuizController.listSubmitted);
quizRoutes.get('/submitted-quizzes/:quiz_attempt_code/', requireAuth, requireStudent, QuizController.getSubmitted);

// Subject-specific Quiz Endpoints
quizRoutes.get('/subject/:subjectCode', requireAuth, QuizController.getSubjectQuizzes);
quizRoutes.post('/publish-subject-quiz', requireAuth, requireTeacher, QuizController.publishSubjectQuiz);


