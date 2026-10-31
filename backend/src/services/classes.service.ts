import { AppDataSource } from '@/config/db';
import { Section, Student, Subject, Teacher, TeachingAssignment, StudentClassRegistration, User } from '@/entities/User';
import { HttpError } from '@/utils/httpError';

export async function listAvailableClasses(user: User) {
  const taRepo = AppDataSource.getRepository(TeachingAssignment);
  const regRepo = AppDataSource.getRepository(StudentClassRegistration);
  const studentRepo = AppDataSource.getRepository(Student);

  const student = await studentRepo.findOne({
    where: { user: { identification_number: user.identification_number } },
    relations: { user: true, section: true },
  });

  const teachingAssignments = await taRepo.find({
    relations: { teacher: { user: true }, subject: true, section: true },
  });

  let myRegistrations: StudentClassRegistration[] = [];
  if (student) {
    myRegistrations = await regRepo.find({
      where: { student: { user_id: student.user_id } },
      relations: { teaching_assignment: { subject: true, teacher: true } },
    });
  }

  const regMap = new Map<number, string>();
  for (const reg of myRegistrations) {
    if (reg.teaching_assignment) {
      regMap.set(reg.teaching_assignment.id, reg.status);
    }
  }

  return teachingAssignments.map((ta) => {
    const isStreamElective = ta.subject.course_type === 'stream_elective';
    let isStreamLocked = false;
    let streamLockReason: string | null = null;

    if (isStreamElective && student && student.current_semester >= 5 && student.enrolled_stream) {
      if (ta.subject.stream_name && ta.subject.stream_name !== student.enrolled_stream) {
        isStreamLocked = true;
        streamLockReason = `Locked to ${student.enrolled_stream} track`;
      }
    }

    return {
      id: ta.id,
      subject_code: ta.subject.subject_code,
      subject_name: ta.subject.subject_name,
      teacher_id: ta.teacher.user_id,
      teacher_name: `${ta.teacher.first_name} ${ta.teacher.last_name}`,
      section_code: ta.section?.section_code ?? 'General',
      credits: ta.subject.credits ?? 3,
      semester: `${ta.semester}${ta.semester === 1 ? 'st' : ta.semester === 2 ? 'nd' : ta.semester === 3 ? 'rd' : 'th'} Semester`,
      academic_year: ta.academic_year,
      course_type: ta.subject.course_type ?? 'core',
      stream_name: ta.subject.stream_name ?? null,
      is_stream_locked: isStreamLocked,
      stream_lock_reason: streamLockReason,
      registration_status: regMap.get(ta.id) ?? 'unregistered',
      is_registered: regMap.has(ta.id) && regMap.get(ta.id) === 'accepted',
    };
  });
}

export async function registerForClass(user: User, payload: { teaching_assignment_id?: number; subject_code?: string }) {
  const studentRepo = AppDataSource.getRepository(Student);
  const taRepo = AppDataSource.getRepository(TeachingAssignment);
  const regRepo = AppDataSource.getRepository(StudentClassRegistration);

  const student = await studentRepo.findOne({
    where: { user: { identification_number: user.identification_number } },
    relations: { user: true },
  });
  if (!student) throw new HttpError(404, 'Student profile not found');

  let ta: TeachingAssignment | null = null;
  if (payload.teaching_assignment_id) {
    ta = await taRepo.findOne({
      where: { id: payload.teaching_assignment_id },
      relations: { teacher: true, subject: true, section: true },
    });
  } else if (payload.subject_code) {
    ta = await taRepo.findOne({
      where: { subject: { subject_code: payload.subject_code } },
      relations: { teacher: true, subject: true, section: true },
    });
  }

  if (!ta) throw new HttpError(404, 'Class not found');

  // Enforce Stream-Locking for Semester 5+ Electives
  if (ta.subject.course_type === 'stream_elective' && student.current_semester >= 5) {
    if (student.enrolled_stream && ta.subject.stream_name && student.enrolled_stream !== ta.subject.stream_name) {
      throw new HttpError(
        400,
        `Elective locked! You are enrolled in the '${student.enrolled_stream}' specialization track and cannot take '${ta.subject.stream_name}' electives.`
      );
    }
    if (!student.enrolled_stream && ta.subject.stream_name) {
      student.enrolled_stream = ta.subject.stream_name;
      await studentRepo.save(student);
    }
  }

  let existing = await regRepo.findOne({
    where: {
      student: { user_id: student.user_id },
      teaching_assignment: { id: ta.id },
    },
  });

  if (!existing) {
    existing = regRepo.create({
      student,
      teaching_assignment: ta,
      status: 'accepted', // Auto-accept so registered student immediately gets class access
    });
    await regRepo.save(existing);
  } else {
    existing.status = 'accepted';
    await regRepo.save(existing);
  }

  return {
    message: 'Registered for class successfully',
    status: existing.status,
    class: {
      id: ta.id,
      subject_code: ta.subject.subject_code,
      subject_name: ta.subject.subject_name,
      teacher_name: `${ta.teacher.first_name} ${ta.teacher.last_name}`,
    },
  };
}

export async function listStudentClasses(user: User) {
  const studentRepo = AppDataSource.getRepository(Student);
  const regRepo = AppDataSource.getRepository(StudentClassRegistration);

  const student = await studentRepo.findOne({
    where: { user: { identification_number: user.identification_number } },
    relations: { user: true },
  });
  if (!student) return [];

  const registrations = await regRepo.find({
    where: {
      student: { user_id: student.user_id },
      status: 'accepted',
    },
    relations: {
      teaching_assignment: {
        teacher: { user: true },
        subject: true,
        section: true,
      },
    },
  });

  return registrations.map((r) => {
    const ta = r.teaching_assignment;
    return {
      SubjectID: ta.subject.subject_code,
      SubjectName: ta.subject.subject_name,
      ClassID: ta.section?.section_code ?? 'CS-A',
      TeacherID: ta.teacher.user_id,
      TeacherName: `${ta.teacher.first_name} ${ta.teacher.last_name}`,
      Credits: String(ta.subject.credits ?? 3),
      Semester: `${ta.semester}${ta.semester === 1 ? 'st' : ta.semester === 2 ? 'nd' : ta.semester === 3 ? 'rd' : 'th'} Semester`,
      AcademicSession: ta.academic_year,
      CourseType: ta.subject.course_type ?? 'core',
      StreamName: ta.subject.stream_name ?? null,
    };
  });
}

export async function listTeacherClasses(user: User) {
  const teacherRepo = AppDataSource.getRepository(Teacher);
  const taRepo = AppDataSource.getRepository(TeachingAssignment);

  const teacher = await teacherRepo.findOne({
    where: { user: { identification_number: user.identification_number } },
    relations: { user: true },
  });
  if (!teacher) return [];

  const tas = await taRepo.find({
    where: { teacher: { user_id: teacher.user_id } },
    relations: { teacher: true, subject: true, section: true },
  });

  return tas.map((ta) => ({
    SubjectID: ta.subject.subject_code,
    SubjectName: ta.subject.subject_name,
    ClassID: ta.section?.section_code ?? 'CS-A',
    TeacherID: ta.teacher.user_id,
    TeacherName: `${ta.teacher.first_name} ${ta.teacher.last_name}`,
    Credits: String(ta.subject.credits ?? 3),
    Semester: `${ta.semester}${ta.semester === 1 ? 'st' : ta.semester === 2 ? 'nd' : ta.semester === 3 ? 'rd' : 'th'} Semester`,
    AcademicSession: ta.academic_year,
    CourseType: ta.subject.course_type ?? 'core',
    StreamName: ta.subject.stream_name ?? null,
  }));
}

export interface StudyMaterialItem {
  id?: string;
  subject_code: string;
  filename: string;
  timestamp: string;
  authorName: string;
  authorDP: string;
  fileLocation: string;
}

const dynamicNotes: StudyMaterialItem[] = [];

const defaultDemoNotes: StudyMaterialItem[] = [
  {
    subject_code: 'SUB1',
    filename: 'Math Notes - Linear Algebra & Calculus.pdf',
    timestamp: '07 Oct 2026',
    authorName: 'Dr. John Doe',
    authorDP: '',
    fileLocation: 'uploads/demo_assignment.pdf',
  },
  {
    subject_code: 'SUB1',
    filename: 'Fourier Transform Lecture Handout.pdf',
    timestamp: '05 Oct 2026',
    authorName: 'Dr. John Doe',
    authorDP: '',
    fileLocation: 'uploads/demo_assignment.pdf',
  },
  {
    subject_code: 'SUB2',
    filename: 'Physics Notes - Electromagnetism & Waves.pdf',
    timestamp: '06 Oct 2026',
    authorName: 'Dr. Jane Smith',
    authorDP: '',
    fileLocation: 'uploads/demo_assignment.pdf',
  },
  {
    subject_code: 'SUB2',
    filename: 'Maxwell Equations & Optics Guide.pdf',
    timestamp: '04 Oct 2026',
    authorName: 'Dr. Jane Smith',
    authorDP: '',
    fileLocation: 'uploads/demo_assignment.pdf',
  },
  {
    subject_code: 'SUB3',
    filename: 'CS Notes - Data Structures & Algorithms.pdf',
    timestamp: '07 Oct 2026',
    authorName: 'Dr. Alan Turing',
    authorDP: '',
    fileLocation: 'uploads/demo_assignment.pdf',
  },
  {
    subject_code: 'SUB3',
    filename: 'Red-Black Trees & Graphs Cheatsheet.pdf',
    timestamp: '03 Oct 2026',
    authorName: 'Dr. Alan Turing',
    authorDP: '',
    fileLocation: 'uploads/demo_assignment.pdf',
  },
];

export async function addStudyMaterial(
  user: User,
  data: { subject_code: string; caption?: string; file?: Express.Multer.File }
): Promise<StudyMaterialItem> {
  const teacherRepo = AppDataSource.getRepository(Teacher);
  const teacher = await teacherRepo.findOne({
    where: { user: { identification_number: user.identification_number } },
  });
  const teacherName = teacher ? `${teacher.first_name} ${teacher.last_name}`.trim() : 'Instructor';
  const timestamp = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const filename = data.caption?.trim() || data.file?.originalname || 'Lecture Material.pdf';
  const fileLocation = data.file ? `uploads/${data.file.filename}` : 'uploads/demo_assignment.pdf';

  const newItem: StudyMaterialItem = {
    subject_code: data.subject_code,
    filename,
    timestamp,
    authorName: teacherName,
    authorDP: '',
    fileLocation,
  };

  dynamicNotes.unshift(newItem);
  return newItem;
}

export async function getStudyMaterials(user: User, subjectCode?: string) {
  const allNotes = [...dynamicNotes, ...defaultDemoNotes];

  if (user.role === 'teacher') {
    if (subjectCode) {
      return allNotes.filter(
        (n) => n.subject_code === subjectCode || n.subject_code.toLowerCase().includes(subjectCode.toLowerCase())
      );
    }
    return allNotes;
  }

  // If student, find registered subjects
  const studentClasses = await listStudentClasses(user);
  const registeredSubjectCodes = new Set(studentClasses.map((c) => c.SubjectID));

  let filtered = allNotes.filter(
    (n) => registeredSubjectCodes.has(n.subject_code) || (subjectCode && n.subject_code === subjectCode)
  );

  if (subjectCode) {
    const byCode = allNotes.filter(
      (n) => n.subject_code === subjectCode || n.subject_code.toLowerCase().includes(subjectCode.toLowerCase())
    );
    if (byCode.length > 0) return byCode;
  }

  return filtered.length > 0 ? filtered : allNotes;
}
