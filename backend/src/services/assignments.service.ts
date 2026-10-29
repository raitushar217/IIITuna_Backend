import path from 'path';
import { AppDataSource } from '@/config/db';
import { Assignment, AssignmentSubmission } from '@/entities/Assignment';
import { Section, Student, StudentClassRegistration, Subject, Teacher, User } from '@/entities/User';
import { HttpError } from '@/utils/httpError';

export async function listAssignments(user: User) {
  const repo = AppDataSource.getRepository(Assignment);
  if (user.role === 'teacher') {
    const teacherRepo = AppDataSource.getRepository(Teacher);
    const teacher = await teacherRepo.findOne({
      where: { user: { identification_number: user.identification_number } },
      relations: { user: true },
    });
    if (!teacher) return [];
    return repo.find({
      where: { teacher: { user: { identification_number: teacher.user.identification_number } } },
      relations: { section: true, subject: true, teacher: true },
    });
  }

  if (user.role === 'student') {
    const studentRepo = AppDataSource.getRepository(Student);
    const regRepo = AppDataSource.getRepository(StudentClassRegistration);
    const student = await studentRepo.findOne({
      where: { user: { identification_number: user.identification_number } },
      relations: { user: true },
    });
    if (!student) return [];

    const registrations = await regRepo.find({
      where: { student: { user_id: student.user_id }, status: 'accepted' },
      relations: { teaching_assignment: { subject: true } },
    });

    if (registrations.length === 0) return [];

    const subjectCodes = registrations.map((r) => r.teaching_assignment?.subject?.subject_code).filter(Boolean);
    if (subjectCodes.length === 0) return [];

    const assignments = await repo.find({
      relations: { section: true, subject: true, teacher: true },
    });

    return assignments.filter((a) => a.subject && subjectCodes.includes(a.subject.subject_code));
  }

  return [];
}

export function assignmentToDjangoShape(a: Assignment) {
  return {
    id: a.id,
    name: a.name,
    description: a.description ?? '',
    due_date: a.due_date,
    section_name: a.section?.section_code ?? null,
    subject_name: (a.subject as any).name ?? a.subject.subject_name,
    teacher_name: a.teacher.first_name,
    assignment_pdf: a.assignment_pdf,
    total_marks: a.total_marks,
    created_at: a.created_at,
  };
}

export async function createAssignment(params: { user: User; body: any; filePath: string }) {
  const teacherRepo = AppDataSource.getRepository(Teacher);
  const subjectRepo = AppDataSource.getRepository(Subject);
  const assignmentRepo = AppDataSource.getRepository(Assignment);

  const teacher = await teacherRepo.findOne({
    where: { user: { identification_number: params.user.identification_number } },
    relations: { user: true },
  });
  if (!teacher) throw new HttpError(400, 'Validation error', { teacher: ['Teacher not found'] });

  const section_code = params.body?.section_code;
  const subject_code = params.body?.subject_code;
  if (!section_code) throw new HttpError(400, 'Validation error', { section_code: ['This field is required.'] });
  if (!subject_code) throw new HttpError(400, 'Validation error', { subject_code: ['This field is required.'] });

  const sectionRef = AppDataSource.getRepository(Section).create({ section_code: String(section_code) });
  const subjectRef = AppDataSource.getRepository(Subject).create({ subject_code: String(subject_code) });

  const a = assignmentRepo.create({
    name: String(params.body?.name ?? ''),
    description: params.body?.description ? String(params.body.description) : null,
    due_date: String(params.body?.due_date ?? ''),
    total_marks: params.body?.total_marks != null ? Number(params.body.total_marks) : null,
    assignment_pdf: path.relative(process.cwd(), params.filePath).split(path.sep).join('/'),
    teacher,
    section: sectionRef,
    subject: subjectRef,
  });

  await assignmentRepo.save(a);
  const full = await assignmentRepo.findOneOrFail({
    where: { id: a.id },
    relations: { section: true, subject: true, teacher: true },
  });
  return assignmentToDjangoShape(full);
}

export async function listSubmissionsForTeacher(user: User) {
  const teacherRepo = AppDataSource.getRepository(Teacher);
  const subRepo = AppDataSource.getRepository(AssignmentSubmission);
  const teacher = await teacherRepo.findOne({
    where: { user: { identification_number: user.identification_number } },
    relations: { user: true },
  });
  if (!teacher) return [];

  return subRepo.find({
    where: { assignment: { teacher: { user: { identification_number: teacher.user.identification_number } } } },
    relations: { student: { user: true }, assignment: true },
  });
}

export async function listSubmissionsForStudent(user: User) {
  const studentRepo = AppDataSource.getRepository(Student);
  const subRepo = AppDataSource.getRepository(AssignmentSubmission);
  const student = await studentRepo.findOne({
    where: { user: { identification_number: user.identification_number } },
    relations: { user: true },
  });
  if (!student) return [];

  return subRepo.find({
    where: { student: { user: { identification_number: student.user.identification_number } } },
    relations: { student: { user: true }, assignment: true },
  });
}

export function submissionToDjangoShape(s: AssignmentSubmission) {
  return {
    id: s.id,
    student: s.student.user.identification_number,
    student_name: `${s.student.first_name} ${s.student.last_name}`.trim(),
    marks: s.marks,
    feedback: s.feedback ?? '',
    status: s.status ?? (s.marks != null ? 'graded' : 'submitted'),
    submission_pdf: s.submission_pdf,
    submitted_at: s.submitted_at,
    assignment_id: String(s.assignment.id),
    assignment_name: s.assignment.name,
    total_marks: s.assignment.total_marks,
  };
}

export async function getSubmissionsForAssignment(user: User, assignmentId: number) {
  const teacherRepo = AppDataSource.getRepository(Teacher);
  const subRepo = AppDataSource.getRepository(AssignmentSubmission);

  const teacher = await teacherRepo.findOne({
    where: { user: { identification_number: user.identification_number } },
    relations: { user: true },
  });
  if (!teacher) throw new HttpError(403, 'Only teachers can view assignment submissions');

  return subRepo.find({
    where: { assignment: { id: assignmentId } },
    relations: { student: { user: true }, assignment: true },
    order: { submitted_at: 'DESC' },
  });
}

export async function gradeSubmission(
  user: User,
  submissionId: number,
  payload: { marks: number; feedback?: string }
) {
  const teacherRepo = AppDataSource.getRepository(Teacher);
  const subRepo = AppDataSource.getRepository(AssignmentSubmission);

  const teacher = await teacherRepo.findOne({
    where: { user: { identification_number: user.identification_number } },
    relations: { user: true },
  });
  if (!teacher) throw new HttpError(403, 'Only teachers can grade submissions');

  const sub = await subRepo.findOne({
    where: { id: submissionId },
    relations: { student: { user: true }, assignment: { subject: true } },
  });
  if (!sub) throw new HttpError(404, 'Submission not found');

  sub.marks = Number(payload.marks);
  sub.feedback = payload.feedback ? String(payload.feedback) : 'Graded';
  sub.status = 'graded';
  await subRepo.save(sub);

  return submissionToDjangoShape(sub);
}

export async function createSubmission(params: { user: User; body: any; filePath: string }) {
  const studentRepo = AppDataSource.getRepository(Student);
  const assignmentRepo = AppDataSource.getRepository(Assignment);
  const subRepo = AppDataSource.getRepository(AssignmentSubmission);

  const student = await studentRepo.findOne({
    where: { user: { identification_number: params.user.identification_number } },
    relations: { user: true },
  });
  if (!student) throw new HttpError(400, 'Validation error', { student: ['Student not found'] });

  const assignment_id = params.body?.assignment_id;
  if (!assignment_id) throw new HttpError(400, 'Validation error', { assignment_id: ['This field is required.'] });

  const assignment = await assignmentRepo.findOne({ where: { id: Number(assignment_id) } });
  if (!assignment) throw new HttpError(400, 'Validation error', { assignment_id: ['Assignment not found'] });

  const sub = subRepo.create({
    student,
    assignment,
    marks: null,
    submission_pdf: path.relative(process.cwd(), params.filePath).split(path.sep).join('/'),
  });
  await subRepo.save(sub);

  const full = await subRepo.findOneOrFail({
    where: { id: sub.id },
    relations: { student: { user: true }, assignment: true },
  });

  return submissionToDjangoShape(full);
}

