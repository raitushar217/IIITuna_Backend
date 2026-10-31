import { AppDataSource } from '@/config/db';
import {
  Student,
  Teacher,
  Subject,
  TeachingAssignment,
  StudentClassRegistration,
  User,
  ProctoringIncident,
} from '@/entities/User';
import { Assignment, AssignmentSubmission } from '@/entities/Assignment';
import { Quiz } from '@/entities/Quiz';
import { AttendanceSession } from '@/entities/Attendance';
import { HttpError } from '@/utils/httpError';

export async function getAdminStats() {
  const studentRepo = AppDataSource.getRepository(Student);
  const teacherRepo = AppDataSource.getRepository(Teacher);
  const subjectRepo = AppDataSource.getRepository(Subject);
  const assignmentRepo = AppDataSource.getRepository(Assignment);
  const submissionRepo = AppDataSource.getRepository(AssignmentSubmission);
  const quizRepo = AppDataSource.getRepository(Quiz);
  const attendanceRepo = AppDataSource.getRepository(AttendanceSession);
  const incidentRepo = AppDataSource.getRepository(ProctoringIncident);

  const [
    totalStudents,
    totalTeachers,
    totalCourses,
    totalAssignments,
    totalSubmissions,
    totalQuizzes,
    attendanceSessions,
    flaggedIncidents,
  ] = await Promise.all([
    studentRepo.count(),
    teacherRepo.count(),
    subjectRepo.count(),
    assignmentRepo.count(),
    submissionRepo.count(),
    quizRepo.count(),
    attendanceRepo.find(),
    incidentRepo.count({ where: { status: 'flagged' } }),
  ]);

  let totalRecords = 0;
  let totalPresent = 0;
  for (const s of attendanceSessions) {
    totalRecords += s.total_students;
    totalPresent += s.present_count;
  }
  const avgAttendance = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 85;

  return {
    institute: 'Indian Institute of Information Technology Una',
    total_students: totalStudents,
    total_teachers: totalTeachers,
    total_courses: totalCourses,
    total_assignments: totalAssignments,
    total_submissions: totalSubmissions,
    total_quizzes: totalQuizzes,
    average_attendance_percentage: avgAttendance,
    flagged_proctoring_incidents: flaggedIncidents,
    active_academic_year: '2026-2027',
  };
}

export async function getCurriculum(branchCode?: string, semester?: number) {
  const subRepo = AppDataSource.getRepository(Subject);
  const whereClause: any = {};
  if (semester) whereClause.semester = semester;

  const subjects = await subRepo.find({
    where: whereClause,
    relations: { specialization_branch: true },
    order: { semester: 'ASC', subject_code: 'ASC' },
  });

  const filtered = branchCode
    ? subjects.filter(
        (s) =>
          !s.specialization_branch ||
          s.specialization_branch.specialization_branch_code === branchCode ||
          s.course_type === 'open_elective'
      )
    : subjects;

  const grouped: Record<number, any[]> = {};
  for (let sem = 1; sem <= 8; sem++) {
    grouped[sem] = [];
  }

  for (const sub of filtered) {
    const sem = sub.semester || 1;
    if (!grouped[sem]) grouped[sem] = [];
    grouped[sem].push({
      subject_code: sub.subject_code,
      subject_name: sub.subject_name,
      credits: sub.credits,
      branch: sub.specialization_branch?.specialization_branch_code ?? 'Common',
      course_type: sub.course_type,
      stream_name: sub.stream_name,
      prerequisite: sub.prerequisite_course_code,
    });
  }

  return grouped;
}

export async function getStudentsList(query: {
  branch?: string;
  semester?: number;
  stream?: string;
  search?: string;
  limit?: number;
  page?: number;
}) {
  const studentRepo = AppDataSource.getRepository(Student);
  const qb = studentRepo
    .createQueryBuilder('student')
    .leftJoinAndSelect('student.user', 'user')
    .leftJoinAndSelect('student.section', 'section')
    .leftJoinAndSelect('section.specialization_branch', 'branch');

  if (query.semester) {
    qb.andWhere('student.current_semester = :sem', { sem: query.semester });
  }

  if (query.stream) {
    qb.andWhere('student.enrolled_stream = :stream', { stream: query.stream });
  }

  if (query.branch) {
    qb.andWhere('branch.specialization_branch_code = :bCode', { bCode: query.branch });
  }

  if (query.search) {
    qb.andWhere(
      '(student.user_id ILIKE :s OR student.first_name ILIKE :s OR student.last_name ILIKE :s)',
      { s: `%${query.search}%` }
    );
  }

  const limit = query.limit ?? 50;
  const page = query.page ?? 1;
  const offset = (page - 1) * limit;

  qb.skip(offset).take(limit).orderBy('student.user_id', 'ASC');

  const [students, total] = await qb.getManyAndCount();

  return {
    total,
    page,
    limit,
    students: students.map((s) => ({
      roll_number: s.user_id,
      name: `${s.first_name} ${s.last_name}`,
      batch: s.batch,
      semester: s.current_semester,
      branch: s.section?.specialization_branch?.specialization_branch_code ?? 'CSE',
      section: s.section?.section_code ?? 'CS-A',
      stream: s.enrolled_stream ?? (s.current_semester >= 5 ? 'Pending Selection' : 'Core (N/A)'),
      cgpa: s.cgpa ?? 8.0,
      is_active: s.user?.is_active ?? true,
    })),
  };
}

export async function getTeachersList() {
  const teacherRepo = AppDataSource.getRepository(Teacher);
  const taRepo = AppDataSource.getRepository(TeachingAssignment);

  const teachers = await teacherRepo.find({
    relations: { user: true },
    order: { user_id: 'ASC' },
  });

  const tas = await taRepo.find({
    relations: { teacher: true, subject: true, section: true },
  });

  return teachers.map((t) => {
    const myClasses = tas.filter((ta) => ta.teacher.user_id === t.user_id);
    return {
      teacher_id: t.user_id,
      name: `${t.first_name} ${t.last_name}`,
      department: t.department,
      allocated_classes_count: myClasses.length,
      classes: myClasses.map((ta) => ({
        subject_code: ta.subject.subject_code,
        subject_name: ta.subject.subject_name,
        semester: ta.semester,
        section: ta.section?.section_code,
      })),
    };
  });
}

export async function getAttendanceDefaulters(thresholdPercentage = 75) {
  const attendanceRepo = AppDataSource.getRepository(AttendanceSession);
  const studentRepo = AppDataSource.getRepository(Student);

  const sessions = await attendanceRepo.find();
  const allStudents = await studentRepo.find({
    relations: { user: true, section: { specialization_branch: true } },
  });

  // Calculate per-student attendance stats across sessions
  const statsMap = new Map<string, { totalSessions: number; attended: number; subjects: Set<string> }>();

  for (const s of sessions) {
    for (const r of s.records) {
      if (!statsMap.has(r.student_id)) {
        statsMap.set(r.student_id, { totalSessions: 0, attended: 0, subjects: new Set() });
      }
      const item = statsMap.get(r.student_id)!;
      item.totalSessions += 1;
      item.subjects.add(s.subject_code);
      if (r.status === 'present' || r.status === 'late') {
        item.attended += 1;
      }
    }
  }

  const defaulters: any[] = [];
  for (const stu of allStudents) {
    const stats = statsMap.get(stu.user_id);
    if (stats && stats.totalSessions > 0) {
      const pct = Math.round((stats.attended / stats.totalSessions) * 100);
      if (pct < thresholdPercentage) {
        defaulters.push({
          roll_number: stu.user_id,
          name: `${stu.first_name} ${stu.last_name}`,
          semester: stu.current_semester,
          branch: stu.section?.specialization_branch?.specialization_branch_code ?? 'CSE',
          total_sessions: stats.totalSessions,
          attended_sessions: stats.attended,
          attendance_percentage: pct,
          status: 'Debarred from End-Term Examination',
        });
      }
    }
  }

  return {
    threshold_percentage: thresholdPercentage,
    defaulters_count: defaulters.length,
    defaulters,
  };
}

export async function lockStudentStream(studentId: string, streamName: string) {
  const studentRepo = AppDataSource.getRepository(Student);
  const student = await studentRepo.findOne({
    where: { user_id: studentId },
    relations: { user: true },
  });

  if (!student) throw new HttpError(404, 'Student not found');

  student.enrolled_stream = streamName;
  await studentRepo.save(student);

  return {
    message: `Stream locked to ${streamName} for student ${student.first_name} ${student.last_name} (${studentId})`,
    student_id: studentId,
    enrolled_stream: streamName,
  };
}

export async function getProctoringIncidents() {
  const incidentRepo = AppDataSource.getRepository(ProctoringIncident);
  return incidentRepo.find({
    order: { created_at: 'DESC' },
  });
}

export async function updateIncidentStatus(id: number, status: 'reviewed' | 'penalized' | 'dismissed') {
  const incidentRepo = AppDataSource.getRepository(ProctoringIncident);
  const incident = await incidentRepo.findOne({ where: { id } });
  if (!incident) throw new HttpError(404, 'Incident not found');

  incident.status = status;
  await incidentRepo.save(incident);

  return incident;
}

