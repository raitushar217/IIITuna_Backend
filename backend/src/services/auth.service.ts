import bcrypt from 'bcryptjs';
import { AppDataSource, env } from '@/config/db';
import { AuthToken, Section, Student, Teacher, User } from '@/entities/User';
import { HttpError } from '@/utils/httpError';
import { newTokenKey } from '@/middleware/auth';

export async function login(identification_number: string, password: string) {
  const userRepo = AppDataSource.getRepository(User);
  const tokenRepo = AppDataSource.getRepository(AuthToken);
  const studentRepo = AppDataSource.getRepository(Student);
  const teacherRepo = AppDataSource.getRepository(Teacher);

  const user = await userRepo.findOne({ where: { identification_number } });
  if (!user) throw new HttpError(401, 'Invalid credentials');

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new HttpError(401, 'Invalid credentials');

  let token = await tokenRepo.findOne({ where: { user: { identification_number } }, relations: { user: true } });
  if (!token) {
    token = tokenRepo.create({ key: newTokenKey(env.TOKEN_BYTES), user });
    await tokenRepo.save(token);
  }

  const user_data: Record<string, unknown> = {
    identification_number: user.identification_number,
    role: user.role,
  };

  if (user.role === 'student') {
    const student = await studentRepo.findOne({
      where: { user: { identification_number } },
      relations: { user: true },
    });
    if (student) user_data.name = `${student.first_name} ${student.last_name}`;
  }

  if (user.role === 'teacher') {
    const teacher = await teacherRepo.findOne({
      where: { user: { identification_number } },
      relations: { user: true },
    });
    if (teacher) user_data.name = `${teacher.first_name} ${teacher.last_name}`;
  }

  return { token: token.key, user: user_data };
}

export async function logout(user: User) {
  const tokenRepo = AppDataSource.getRepository(AuthToken);
  const token = await tokenRepo.findOne({ where: { user: { identification_number: user.identification_number } } });
  if (token) await tokenRepo.remove(token);
  return { message: 'Successfully logged out' };
}

export async function registerStudent(input: {
  identification_number: string;
  password: string;
  first_name: string;
  last_name: string;
  batch: string;
  section_code?: string;
}) {
  const userRepo = AppDataSource.getRepository(User);
  const studentRepo = AppDataSource.getRepository(Student);
  const sectionRepo = AppDataSource.getRepository(Section);
  const tokenRepo = AppDataSource.getRepository(AuthToken);

  const { identification_number, password, section_code, ...profile } = input;

  let user = await userRepo.findOne({ where: { identification_number } });
  if (!user) {
    user = userRepo.create({
      identification_number,
      role: 'student',
      password_hash: await bcrypt.hash(password, 10),
      is_active: true,
      is_staff: false,
      is_superuser: false,
    });
    await userRepo.save(user);
  } else if (user.role !== 'student') {
    throw new HttpError(400, 'Validation error', {
      identification_number: ['This ID is already registered with a different role.'],
    });
  } else {
    // keep behavior close to DRF: no password update here
  }

  let section: Section | null | undefined;
  if (section_code) {
    section = await sectionRepo.findOne({ where: { section_code } });
  }

  const existing = await studentRepo.findOne({ where: { user: { identification_number } }, relations: { user: true } });
  const student =
    existing ??
    studentRepo.create({
      user,
      ...(section && { section }),
      ...profile,
    });
  if (!existing) await studentRepo.save(student);

  let token = await tokenRepo.findOne({ where: { user: { identification_number } }, relations: { user: true } });
  if (!token) {
    token = tokenRepo.create({ key: newTokenKey(env.TOKEN_BYTES), user });
    await tokenRepo.save(token);
  }

  return {
    token: token.key,
    user: {
      identification_number: user.identification_number,
      role: user.role,
      name: `${student.first_name} ${student.last_name}`,
    },
  };
}

export async function registerTeacher(input: {
  identification_number: string;
  password: string;
  first_name: string;
  last_name: string;
  department: string;
  specialization_branch_code?: string;
}) {
  const userRepo = AppDataSource.getRepository(User);
  const teacherRepo = AppDataSource.getRepository(Teacher);
  const tokenRepo = AppDataSource.getRepository(AuthToken);

  const { identification_number, password, specialization_branch_code, ...profile } = input;

  let user = await userRepo.findOne({ where: { identification_number } });
  if (!user) {
    user = userRepo.create({
      identification_number,
      role: 'teacher',
      password_hash: await bcrypt.hash(password, 10),
      is_active: true,
      is_staff: false,
      is_superuser: false,
    });
    await userRepo.save(user);
  } else if (user.role !== 'teacher') {
    throw new HttpError(400, 'Validation error', {
      identification_number: ['This ID is already registered with a different role.'],
    });
  }

  const existing = await teacherRepo.findOne({ where: { user: { identification_number } }, relations: { user: true } });
  const teacher =
    existing ??
    teacherRepo.create({
      user,
      specialization_branch_code: specialization_branch_code ? String(specialization_branch_code) : null,
      ...profile,
    });
  if (!existing) await teacherRepo.save(teacher);

  let token = await tokenRepo.findOne({ where: { user: { identification_number } }, relations: { user: true } });
  if (!token) {
    token = tokenRepo.create({ key: newTokenKey(env.TOKEN_BYTES), user });
    await tokenRepo.save(token);
  }

  return {
    token: token.key,
    user: {
      identification_number: user.identification_number,
      role: user.role,
      name: `${teacher.first_name} ${teacher.last_name}`,
    },
  };
}

export async function getProfile(user: User) {
  if (user.role === 'student') {
    const studentRepo = AppDataSource.getRepository(Student);
    const student = await studentRepo.findOne({
      where: { user: { identification_number: user.identification_number } },
      relations: { user: true, section: { specialization_branch: true } },
    });
    if (!student) throw new HttpError(404, 'Not found');

    return {
      identification_number: student.user.identification_number,
      role: student.user.role,
      first_name: student.first_name,
      last_name: student.last_name,
      batch: student.batch,
      section: student.section?.section_code ?? null,
      section_name: (student.section as any)?.name ?? null,
      specialization_branch_name: student.section?.specialization_branch?.name ?? null,
    };
  }

  if (user.role === 'teacher') {
    const teacherRepo = AppDataSource.getRepository(Teacher);
    const teacher = await teacherRepo.findOne({
      where: { user: { identification_number: user.identification_number } },
      relations: { user: true },
    });
    if (!teacher) throw new HttpError(404, 'Not found');

    return {
      identification_number: teacher.user.identification_number,
      role: teacher.user.role,
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      phone_number: (teacher as any).phone_number ?? null,
      department: teacher.department,
      specialization_branch: teacher.specialization_branch_code,
      specialization_name: teacher.specialization_branch_code,
    };
  }

  return {
    identification_number: user.identification_number,
    role: user.role,
    is_active: user.is_active,
    date_joined: user.date_joined,
  };
}

export async function updateProfile(user: User, patch: Record<string, unknown>) {
  if (user.role === 'student') {
    const studentRepo = AppDataSource.getRepository(Student);
    const student = await studentRepo.findOne({
      where: { user: { identification_number: user.identification_number } },
      relations: { user: true, section: { specialization_branch: true } },
    });
    if (!student) throw new HttpError(404, 'Not found');

    if (typeof patch.first_name === 'string') student.first_name = patch.first_name;
    if (typeof patch.last_name === 'string') student.last_name = patch.last_name;
    if (typeof patch.batch === 'string') student.batch = patch.batch;
    await studentRepo.save(student);
    return getProfile(user);
  }

  if (user.role === 'teacher') {
    const teacherRepo = AppDataSource.getRepository(Teacher);
    const teacher = await teacherRepo.findOne({
      where: { user: { identification_number: user.identification_number } },
      relations: { user: true },
    });
    if (!teacher) throw new HttpError(404, 'Not found');

    if (typeof patch.first_name === 'string') teacher.first_name = patch.first_name;
    if (typeof patch.last_name === 'string') teacher.last_name = patch.last_name;
    if (typeof patch.department === 'string') teacher.department = patch.department;
    await teacherRepo.save(teacher);
    return getProfile(user);
  }

  return getProfile(user);
}

export async function changePassword(user: User, old_password: string, new_password: string) {
  const userRepo = AppDataSource.getRepository(User);
  const fresh = await userRepo.findOne({ where: { identification_number: user.identification_number } });
  if (!fresh) throw new HttpError(404, 'Not found');

  const ok = await bcrypt.compare(old_password, fresh.password_hash);
  if (!ok) throw new HttpError(400, 'Validation error', { old_password: ['Old password is incorrect'] });

  fresh.password_hash = await bcrypt.hash(new_password, 10);
  await userRepo.save(fresh);
  return { message: 'Password changed successfully' };
}

