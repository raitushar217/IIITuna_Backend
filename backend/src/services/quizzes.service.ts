import crypto from 'crypto';
import { AppDataSource } from '@/config/db';
import { Section, Student, Subject, Teacher, User } from '@/entities/User';
import {
  Question,
  QuestionOption,
  Quiz,
  QuizAttempt,
  StudentSelectedQuestionOption,
} from '@/entities/Quiz';
import { HttpError } from '@/utils/httpError';

function isActive(quiz: Quiz) {
  const now = new Date();
  return now >= quiz.start_time && now <= quiz.end_time;
}

export async function listQuizzes(user: User) {
  const repo = AppDataSource.getRepository(Quiz);

  if (user.role === 'teacher') {
    const teacherRepo = AppDataSource.getRepository(Teacher);
    const teacher = await teacherRepo.findOne({
      where: { user: { identification_number: user.identification_number } },
      relations: { user: true },
    });
    if (!teacher) return [];
    return repo.find({
      where: { teacher: { user_id: teacher.user_id } },
      relations: { quiz_subject: true, sections: true, teacher: { user: true } },
    });
  }

  if (user.role === 'student') {
    const studentRepo = AppDataSource.getRepository(Student);
    const student = await studentRepo.findOne({
      where: { user: { identification_number: user.identification_number } },
      relations: { user: true, section: true },
    });
    if (!student || !student.section) return [];
    return repo
      .createQueryBuilder('quiz')
      .leftJoinAndSelect('quiz.quiz_subject', 'quiz_subject')
      .leftJoinAndSelect('quiz.sections', 'sections')
      .leftJoinAndSelect('quiz.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'teacher_user')
      .where('sections.section_code = :section', { section: student.section.section_code })
      .getMany();
  }

  return [];
}

export function optionToDjangoShape(o: QuestionOption) {
  return {
    option_code: o.option_code,
    text: o.text,
    is_correct: o.is_correct,
  };
}

export function questionToDjangoShape(q: Question, options: QuestionOption[] = []) {
  return {
    question_code: q.question_code,
    question_text: q.question_text,
    question_type: q.question_type,
    marks: q.marks,
    order: q.order,
    options: options.map(optionToDjangoShape),
  };
}

export function quizToDjangoShape(quiz: Quiz) {
  return {
    id: quiz.id,
    quiz_name: quiz.quiz_name,
    quiz_description: quiz.quiz_description ?? '',
    total_marks: quiz.total_marks,
    time_limit_minutes: quiz.time_limit_minutes,
    instructions: quiz.instructions ?? '',
    due_date: quiz.due_date,
    start_time: quiz.start_time,
    end_time: quiz.end_time,
    is_proctored: quiz.is_proctored,
    created_at: quiz.created_at,
    questions: [],
    is_active: isActive(quiz),
  };
}

export async function createQuiz(user: User, body: any) {
  const subjectCode = String(body?.quiz_subject_code ?? '');
  const sectionCodes: string[] = Array.isArray(body?.sections) ? body.sections.map(String) : [];

  const teacherRepo = AppDataSource.getRepository(Teacher);
  const subjectRepo = AppDataSource.getRepository(Subject);
  const sectionRepo = AppDataSource.getRepository(Section);
  const repo = AppDataSource.getRepository(Quiz);

  const teacher = await teacherRepo.findOne({
    where: { user: { identification_number: user.identification_number } },
    relations: { user: true },
  });
  if (!teacher) throw new HttpError(400, 'Validation error', { teacher_identification_number: ['Teacher not found'] });

  const subject = await subjectRepo.findOne({ where: { subject_code: subjectCode } });
  if (!subject) throw new HttpError(400, 'Validation error', { quiz_subject_code: ['Subject not found'] });

  const sections = sectionCodes.length
    ? await sectionRepo.findBy(sectionCodes.map((section_code) => ({ section_code })))
    : [];
  if (sections.length !== sectionCodes.length) {
    const missing = sectionCodes.filter((c) => !sections.some((s) => s.section_code === c));
    throw new HttpError(400, 'Validation error', { sections: [`Section with code ${missing[0]} not found`] });
  }

  const quiz = repo.create({
    quiz_name: String(body?.quiz_name ?? ''),
    quiz_description: body?.quiz_description ? String(body.quiz_description) : null,
    quiz_subject: subject,
    teacher,
    total_marks: Number(body?.total_marks ?? 0),
    time_limit_minutes: Number(body?.time_limit_minutes ?? 60),
    instructions: body?.instructions ? String(body.instructions) : null,
    due_date: String(body?.due_date ?? ''),
    start_time: new Date(String(body?.start_time)),
    end_time: new Date(String(body?.end_time)),
    is_proctored: Boolean(body?.is_proctored ?? false),
    sections,
  });

  await repo.save(quiz);
  const full = await repo.findOneOrFail({
    where: { id: quiz.id },
    relations: { quiz_subject: true, sections: true, teacher: { user: true } },
  });
  return quizToDjangoShape(full);
}

export async function listQuestionsForTeacher(user: User) {
  const teacherRepo = AppDataSource.getRepository(Teacher);
  const questionRepo = AppDataSource.getRepository(Question);
  const optionRepo = AppDataSource.getRepository(QuestionOption);
  const teacher = await teacherRepo.findOne({
    where: { user: { identification_number: user.identification_number } },
    relations: { user: true },
  });
  if (!teacher) return [];

  const questions = await questionRepo
    .createQueryBuilder('question')
    .leftJoin('question.quiz', 'quiz')
    .leftJoin('quiz.teacher', 'teacher')
    .where('teacher.user_id = :uid', { uid: teacher.user_id })
    .getMany();

  const codes = questions.map((q) => q.question_code);
  const options = codes.length
    ? await optionRepo
        .createQueryBuilder('option')
        .leftJoin('option.related_question', 'question')
        .where('question.question_code IN (:...codes)', { codes })
        .getMany()
    : [];

  const byQ = new Map<string, QuestionOption[]>();
  for (const o of options) {
    const qc = (o.related_question as any)?.question_code;
    if (!qc) continue;
    const arr = byQ.get(qc) ?? [];
    arr.push(o);
    byQ.set(qc, arr);
  }

  return questions.map((q) => questionToDjangoShape(q, byQ.get(q.question_code) ?? []));
}

export async function createQuestion(body: any) {
  const quizId = Number(body?.quiz_id);
  const quizRepo = AppDataSource.getRepository(Quiz);
  const questionRepo = AppDataSource.getRepository(Question);
  const quiz = await quizRepo.findOne({ where: { id: quizId } });
  if (!quiz) throw new HttpError(400, 'Validation error', { quiz_id: ['Quiz not found'] });

  const q = questionRepo.create({
    question_code: body?.question_code ? String(body.question_code) : crypto.randomUUID(),
    quiz,
    question_text: String(body?.question_text ?? ''),
    question_type: String(body?.question_type ?? 'multiple_choice') as any,
    marks: Number(body?.marks ?? 1),
    order: Number(body?.order ?? 0),
    image: null,
    correct_option_code: null,
  });
  await questionRepo.save(q);

  const full = await questionRepo.findOneOrFail({ where: { question_code: q.question_code } });
  return questionToDjangoShape(full, []);
}

export async function listOptionsForTeacher(user: User) {
  const teacherRepo = AppDataSource.getRepository(Teacher);
  const optionRepo = AppDataSource.getRepository(QuestionOption);
  const teacher = await teacherRepo.findOne({
    where: { user: { identification_number: user.identification_number } },
    relations: { user: true },
  });
  if (!teacher) return [];

  return optionRepo
    .createQueryBuilder('option')
    .leftJoin('option.related_question', 'question')
    .leftJoin('question.quiz', 'quiz')
    .leftJoin('quiz.teacher', 'teacher')
    .where('teacher.user_id = :uid', { uid: teacher.user_id })
    .getMany();
}

export async function createOption(body: any) {
  const question_code = String(body?.question_code ?? '');
  const questionRepo = AppDataSource.getRepository(Question);
  const optionRepo = AppDataSource.getRepository(QuestionOption);

  const question = await questionRepo.findOne({ where: { question_code } });
  if (!question) throw new HttpError(400, 'Validation error', { question_code: ['Question not found'] });

  const option = optionRepo.create({
    option_code: crypto.randomUUID(),
    related_question: question,
    text: String(body?.text ?? ''),
    is_correct: Boolean(body?.is_correct ?? false),
  });
  await optionRepo.save(option);

  if (option.is_correct) {
    question.correct_option_code = option.option_code;
    await questionRepo.save(question);
  }

  return {
    option_code: option.option_code,
    text: option.text,
    is_correct: option.is_correct,
  };
}

export function attemptToDjangoShape(a: QuizAttempt) {
  return {
    quiz_attempt_code: a.quiz_attempt_code,
    quiz: a.related_quiz.id,
    quiz_name: a.related_quiz.quiz_name,
    start_time: a.started_at,
    end_time: a.ended_at,
    is_completed: a.is_completed,
    marks_obtained: a.marks_obtained,
  };
}

export async function startAttempt(user: User, quizId: number) {
  const quizRepo = AppDataSource.getRepository(Quiz);
  const studentRepo = AppDataSource.getRepository(Student);
  const attemptRepo = AppDataSource.getRepository(QuizAttempt);

  const quiz = await quizRepo.findOne({ where: { id: quizId } });
  if (!quiz) throw new HttpError(404, 'Not found');
  if (!isActive(quiz)) throw new HttpError(400, 'Quiz is not currently available');

  if (user.role !== 'student') throw new HttpError(403, 'Only students can start quiz attempts');

  const student = await studentRepo.findOne({
    where: { user: { identification_number: user.identification_number } },
    relations: { user: true },
  });
  if (!student) throw new HttpError(400, 'Validation error', { student: ['Student not found'] });

  const attempt = attemptRepo.create({
    quiz_attempt_code: crypto.randomUUID(),
    related_student: student,
    related_quiz: quiz,
    ended_at: null,
    marks_obtained: 0,
    is_completed: false,
  });
  await attemptRepo.save(attempt);
  const full = await attemptRepo.findOneOrFail({ where: { quiz_attempt_code: attempt.quiz_attempt_code }, relations: { related_quiz: true } });
  return attemptToDjangoShape(full);
}

export async function submitAttempt(user: User, quizId: number) {
  if (user.role !== 'student') throw new HttpError(403, 'Only students can submit quiz attempts');

  const attemptRepo = AppDataSource.getRepository(QuizAttempt);
  const studentRepo = AppDataSource.getRepository(Student);
  const answersRepo = AppDataSource.getRepository(StudentSelectedQuestionOption);

  const student = await studentRepo.findOne({
    where: { user: { identification_number: user.identification_number } },
    relations: { user: true },
  });
  if (!student) throw new HttpError(404, 'Not found');

  const attempt = await attemptRepo.findOne({
    where: {
      related_student: { user_id: student.user_id },
      related_quiz: { id: quizId },
      is_completed: false,
    },
    relations: { related_quiz: true },
  });
  if (!attempt) throw new HttpError(404, 'No active quiz attempt found');

  const answers = await answersRepo.find({ where: { quiz_attempt: { quiz_attempt_code: attempt.quiz_attempt_code } } });
  const score = answers.reduce((acc, a) => acc + (a.marks_awarded ?? 0), 0);

  attempt.marks_obtained = score;
  attempt.ended_at = new Date();
  attempt.is_completed = true;
  await attemptRepo.save(attempt);

  const full = await attemptRepo.findOneOrFail({ where: { quiz_attempt_code: attempt.quiz_attempt_code }, relations: { related_quiz: true } });
  return attemptToDjangoShape(full);
}

export async function listSubmittedAttempts(user: User) {
  if (user.role !== 'student') return [];

  const studentRepo = AppDataSource.getRepository(Student);
  const attemptRepo = AppDataSource.getRepository(QuizAttempt);
  const student = await studentRepo.findOne({
    where: { user: { identification_number: user.identification_number } },
    relations: { user: true },
  });
  if (!student) return [];

  return attemptRepo.find({
    where: { related_student: { user_id: student.user_id } },
    relations: { related_quiz: true },
  });
}

export async function getSubmittedAttempt(user: User, quiz_attempt_code: string) {
  if (user.role !== 'student') throw new HttpError(403, 'Only students can view quiz attempts');

  const attemptRepo = AppDataSource.getRepository(QuizAttempt);
  const attempt = await attemptRepo.findOne({
    where: { quiz_attempt_code },
    relations: { related_quiz: true, related_student: { user: true } },
  });
  if (!attempt) throw new HttpError(404, 'Not found');

  if (attempt.related_student.user.identification_number !== user.identification_number) {
    throw new HttpError(403, 'Only students can view quiz attempts');
  }

  return attemptToDjangoShape(attempt);
}

export async function submitAnswer(user: User, body: any) {
  if (user.role !== 'student') throw new HttpError(403, 'You do not have permission to perform this action.');

  const attemptCode = String(body?.quiz_attempt_code ?? '');
  const questionCode = String(body?.question_code ?? '');
  const selectedOptionCode = String(body?.selected_option_code ?? '');

  const attemptRepo = AppDataSource.getRepository(QuizAttempt);
  const questionRepo = AppDataSource.getRepository(Question);
  const optionRepo = AppDataSource.getRepository(QuestionOption);
  const answersRepo = AppDataSource.getRepository(StudentSelectedQuestionOption);

  const attempt = await attemptRepo.findOne({ where: { quiz_attempt_code: attemptCode } });
  if (!attempt) throw new HttpError(400, 'Validation error', { quiz_attempt_code: ['QuizAttempt not found'] });

  const question = await questionRepo.findOne({ where: { question_code: questionCode } });
  if (!question) throw new HttpError(400, 'Validation error', { question_code: ['Question not found'] });

  const option = await optionRepo.findOne({ where: { option_code: selectedOptionCode } });
  if (!option) throw new HttpError(400, 'Validation error', { selected_option_code: ['Option not found'] });

  const marks = question.correct_option_code && question.correct_option_code === selectedOptionCode ? question.marks : 0;

  const answer = answersRepo.create({
    quiz_attempt: attempt,
    question,
    selected_option: option,
    marks_awarded: marks,
  });
  await answersRepo.save(answer);

  // Serializer returns only id (all inputs are write_only)
  return { id: answer.id };
}

export async function getSubjectQuizzes(subjectCode: string) {
  const repo = AppDataSource.getRepository(Quiz);
  const qRepo = AppDataSource.getRepository(Question);
  const optRepo = AppDataSource.getRepository(QuestionOption);

  let quizzes = await repo.find({
    where: { quiz_subject: { subject_code: subjectCode } },
    relations: { quiz_subject: true, sections: true, teacher: { user: true } },
  });

  // If subject is SUB1 (Mathematics) and no quiz exists yet, auto-seed the demo quiz
  if (quizzes.length === 0 && (subjectCode.toUpperCase() === 'SUB1' || subjectCode.toUpperCase().includes('MATH'))) {
    const teacherRepo = AppDataSource.getRepository(Teacher);
    const subjectRepo = AppDataSource.getRepository(Subject);
    const sectionRepo = AppDataSource.getRepository(Section);

    const teacher = await teacherRepo.findOne({ where: { user_id: '111' }, relations: { user: true } });
    const subject = await subjectRepo.findOne({ where: { subject_code: 'SUB1' } });
    const section = await sectionRepo.findOne({ where: { section_code: 'CS-A' } });

    if (teacher && subject) {
      const demoQuiz = repo.create({
        quiz_name: 'Differential Equations & Linear Algebra Quiz',
        quiz_description: 'Strictly proctored continuous assessment covering vector calculus, matrices, and differential equations.',
        quiz_subject: subject,
        teacher: teacher,
        total_marks: 20,
        time_limit_minutes: 15,
        instructions: 'Proctored online exam. Screenshots, switching apps, or backgrounding will automatically trigger test submission.',
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        start_time: new Date(Date.now() - 3600000),
        end_time: new Date(Date.now() + 30 * 86400000),
        is_proctored: true,
        sections: section ? [section] : [],
      });
      await repo.save(demoQuiz);

      // Seed questions
      const demoQuestions = [
        {
          text: 'What is the square root of 64?',
          options: ['4', '6', '8', '10'],
          correct: 2, // 'Option 3' / '8'
        },
        {
          text: 'What is the derivative of f(x) = x^3 + 2x at x = 2?',
          options: ['10', '12', '14', '16'],
          correct: 2, // 3(4) + 2 = 14
        },
        {
          text: 'If A is a 2x2 matrix with det(A) = 5, what is det(2A)?',
          options: ['10', '20', '25', '40'],
          correct: 1, // 2^2 * 5 = 20
        },
        {
          text: 'What is the indefinite integral of 1/x dx?',
          options: ['ln|x| + C', 'x^2/2 + C', '-1/x^2 + C', 'e^x + C'],
          correct: 0,
        },
        {
          text: 'Which vector is orthogonal (perpendicular) to (2, 1)?',
          options: ['(-1, 2)', '(1, 2)', '(2, -1)', '(1, -2)'],
          correct: 0,
        },
      ];

      for (let i = 0; i < demoQuestions.length; i++) {
        const dq = demoQuestions[i];
        const qCode = crypto.randomUUID();
        const question = qRepo.create({
          question_code: qCode,
          quiz: demoQuiz,
          question_text: dq.text,
          question_type: 'multiple_choice',
          marks: 4,
          order: i + 1,
        });
        await qRepo.save(question);

        let correctOptCode = '';
        for (let j = 0; j < dq.options.length; j++) {
          const opt = optRepo.create({
            option_code: crypto.randomUUID(),
            related_question: question,
            text: dq.options[j],
            is_correct: j === dq.correct,
          });
          await optRepo.save(opt);
          if (j === dq.correct) correctOptCode = opt.option_code;
        }
        question.correct_option_code = correctOptCode;
        await qRepo.save(question);
      }

      quizzes = await repo.find({
        where: { quiz_subject: { subject_code: subjectCode } },
        relations: { quiz_subject: true, sections: true, teacher: { user: true } },
      });
    }
  }

  // Load questions for each quiz
  const result = [];
  for (const q of quizzes) {
    const questions = await qRepo.find({
      where: { quiz: { id: q.id } },
      order: { order: 'ASC' },
    });

    const fullQuestions = [];
    for (const quest of questions) {
      const opts = await optRepo.find({
        where: { related_question: { question_code: quest.question_code } },
      });
      fullQuestions.push({
        qid: quest.question_code,
        subjectName: q.quiz_subject?.subject_name ?? '',
        SubjectID: q.quiz_subject?.subject_code ?? subjectCode,
        Questiontext: quest.question_text,
        qOption1: opts[0]?.text ?? '',
        qOption2: opts[1]?.text ?? '',
        qOption3: opts[2]?.text ?? '',
        qOption4: opts[3]?.text ?? '',
        CorrectAnswer: `Option ${opts.findIndex((o) => o.is_correct) + 1}`,
      });
    }

    result.push({
      id: String(q.id),
      quiz_name: q.quiz_name,
      quiz_description: q.quiz_description ?? '',
      subject_id: q.quiz_subject?.subject_code ?? subjectCode,
      time_limit_minutes: String(q.time_limit_minutes),
      due_date: q.due_date,
      questions: fullQuestions,
    });
  }

  return result;
}

export async function publishSubjectQuiz(user: User, body: any) {
  const teacherRepo = AppDataSource.getRepository(Teacher);
  const subjectRepo = AppDataSource.getRepository(Subject);
  const sectionRepo = AppDataSource.getRepository(Section);
  const repo = AppDataSource.getRepository(Quiz);
  const qRepo = AppDataSource.getRepository(Question);
  const optRepo = AppDataSource.getRepository(QuestionOption);

  const teacher = await teacherRepo.findOne({
    where: { user: { identification_number: user.identification_number } },
    relations: { user: true },
  });
  if (!teacher) throw new HttpError(403, 'Teacher profile not found');

  const subjectCode = String(body.subject_code ?? body.quiz_subject_code ?? 'SUB1');
  const subject = await subjectRepo.findOne({ where: { subject_code: subjectCode } });
  if (!subject) throw new HttpError(404, 'Subject not found');

  const sectionCode = String(body.section_code ?? 'CS-A');
  const section = await sectionRepo.findOne({ where: { section_code: sectionCode } });

  const rawQuestions = Array.isArray(body.questions) ? body.questions : [];
  const duration = Number(body.time_limit_minutes ?? body.duration ?? 15);
  const quizName = String(body.quiz_name ?? 'Subject Quiz');

  const quiz = repo.create({
    quiz_name: quizName,
    quiz_description: body.quiz_description ? String(body.quiz_description) : `Quiz for ${subject.subject_name}`,
    quiz_subject: subject,
    teacher: teacher,
    total_marks: rawQuestions.length * 4,
    time_limit_minutes: duration,
    instructions: 'Strictly proctored exam. Any switching of apps or minimization will forcefully submit the quiz.',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    start_time: new Date(Date.now() - 3600000),
    end_time: new Date(Date.now() + 30 * 86400000),
    is_proctored: true,
    sections: section ? [section] : [],
  });

  await repo.save(quiz);

  for (let i = 0; i < rawQuestions.length; i++) {
    const q = rawQuestions[i];
    const qCode = crypto.randomUUID();
    const question = qRepo.create({
      question_code: qCode,
      quiz: quiz,
      question_text: String(q.questionText ?? q.question_text ?? ''),
      question_type: 'multiple_choice',
      marks: 4,
      order: i + 1,
    });
    await qRepo.save(question);

    const optsText = [
      String(q.optionA ?? q.qOption1 ?? ''),
      String(q.optionB ?? q.qOption2 ?? ''),
      String(q.optionC ?? q.qOption3 ?? ''),
      String(q.optionD ?? q.qOption4 ?? ''),
    ];
    const rawCorrect = String(q.correctAnswer ?? q.CorrectAnswer ?? '');
    let correctIdx = 0;
    if (rawCorrect.includes('B') || rawCorrect.includes('2')) correctIdx = 1;
    else if (rawCorrect.includes('C') || rawCorrect.includes('3')) correctIdx = 2;
    else if (rawCorrect.includes('D') || rawCorrect.includes('4')) correctIdx = 3;

    let correctOptCode = '';
    for (let j = 0; j < optsText.length; j++) {
      const isCorrect = j === correctIdx;
      const opt = optRepo.create({
        option_code: crypto.randomUUID(),
        related_question: question,
        text: optsText[j],
        is_correct: isCorrect,
      });
      await optRepo.save(opt);
      if (isCorrect) correctOptCode = opt.option_code;
    }
    question.correct_option_code = correctOptCode;
    await qRepo.save(question);
  }

  return { message: 'Quiz published successfully', quiz_id: quiz.id };
}


