import { AppDataSource } from '@/config/db';
import { Notice } from '@/entities/Notice';
import { Section, Student, Teacher, User } from '@/entities/User';
import { HttpError } from '@/utils/httpError';

export function noticeToDjangoShape(n: Notice) {
  const teacherName = n.teacher ? `${n.teacher.first_name ?? ''} ${n.teacher.last_name ?? ''}`.trim() || 'Teacher' : 'Teacher';
  return {
    id: n.id,
    title: n.title,
    description: n.description,
    created_at: n.created_at,
    section: n.section?.map((s) => s.section_code) ?? [],
    teacher: n.teacher?.user_id ?? n.teacher?.user?.identification_number,
    teacher_name: teacherName,
    author: teacherName,
  };
}

export async function listNotices(user: User) {
  const repo = AppDataSource.getRepository(Notice);

  if (user.role === 'teacher') {
    const teacherRepo = AppDataSource.getRepository(Teacher);
    const teacher = await teacherRepo.findOne({
      where: { user: { identification_number: user.identification_number } },
      relations: { user: true },
    });
    if (!teacher) return [];
    const notices = await repo.find({
      where: { teacher: { user_id: teacher.user_id } },
      relations: { section: true, teacher: { user: true } },
    });
    return notices;
  }

  const studentRepo = AppDataSource.getRepository(Student);
  const student = await studentRepo.findOne({
    where: { user: { identification_number: user.identification_number } },
    relations: { user: true, section: true },
  });
  const studentSection = student?.section?.section_code;
  if (!studentSection) return [];

  const notices = await repo.find({
    relations: { section: true, teacher: { user: true } },
  });

  // Filter to student's section
  return notices.filter((n) => (n.section ?? []).some((s) => s.section_code === studentSection));
}

export async function createNotice(user: User, body: any) {
  const teacherRepo = AppDataSource.getRepository(Teacher);
  const sectionRepo = AppDataSource.getRepository(Section);
  const repo = AppDataSource.getRepository(Notice);

  const teacher = await teacherRepo.findOne({
    where: { user: { identification_number: user.identification_number } },
    relations: { user: true },
  });
  if (!teacher) throw new HttpError(400, 'Validation error', { teacher: ['Teacher not found'] });

  const sectionCodes: string[] = Array.isArray(body?.section) ? body.section.map(String) : [];
  const sections = sectionCodes.length
    ? await sectionRepo.findBy(sectionCodes.map((section_code) => ({ section_code })))
    : [];

  const n = repo.create({
    title: String(body?.title ?? ''),
    description: String(body?.description ?? ''),
    section: sections,
    teacher,
  });

  await repo.save(n);
  const full = await repo.findOneOrFail({ where: { id: n.id }, relations: { section: true, teacher: { user: true } } });
  return noticeToDjangoShape(full);
}

