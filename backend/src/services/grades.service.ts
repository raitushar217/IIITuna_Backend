import { AppDataSource } from '@/config/db';
import { AssessmentItem, GradeCard } from '@/entities/GradeCard';
import { Student, StudentClassRegistration, Subject, Teacher, TeachingAssignment, User } from '@/entities/User';
import { HttpError } from '@/utils/httpError';

function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  return 'F';
}

function getDefaultAssessments(subjectCode: string): {
  assessments: AssessmentItem[];
  teacher_remarks: string;
} {
  if (subjectCode.toUpperCase() === 'SUB1' || subjectCode.toUpperCase().includes('MATH')) {
    return {
      assessments: [
        {
          id: 'asg-1',
          name: 'Assignment 1: Vector Calculus & Limits',
          max_marks: 50,
          obtained_marks: 45,
          weightage: '15%',
        },
        {
          id: 'quiz-1',
          name: 'Quiz 1: Matrices & Linear Algebra',
          max_marks: 20,
          obtained_marks: 18,
          weightage: '15%',
        },
        {
          id: 'mid-term',
          name: 'Mid-Semester Examination',
          max_marks: 100,
          obtained_marks: 88,
          weightage: '30%',
        },
        {
          id: 'end-term',
          name: 'End-Semester Final Examination',
          max_marks: 100,
          obtained_marks: 92,
          weightage: '40%',
        },
      ],
      teacher_remarks: 'Exceptional mastery of mathematical concepts and problem solving.',
    };
  }

  if (subjectCode.toUpperCase() === 'SUB2' || subjectCode.toUpperCase().includes('PHY')) {
    return {
      assessments: [
        {
          id: 'lab-1',
          name: 'Lab Practical: Optics & Laser Experiment',
          max_marks: 50,
          obtained_marks: 42,
          weightage: '20%',
        },
        {
          id: 'quiz-1',
          name: 'Quiz 1: Quantum Mechanics & Waves',
          max_marks: 20,
          obtained_marks: 16,
          weightage: '15%',
        },
        {
          id: 'mid-term',
          name: 'Mid-Semester Examination',
          max_marks: 100,
          obtained_marks: 81,
          weightage: '30%',
        },
        {
          id: 'project-viva',
          name: 'Final Project & Practical Viva',
          max_marks: 100,
          obtained_marks: 85,
          weightage: '35%',
        },
      ],
      teacher_remarks: 'Good theoretical understanding and diligent laboratory coursework.',
    };
  }

  return {
    assessments: [
      {
        id: 'asg-1',
        name: 'Coursework Assignment 1',
        max_marks: 50,
        obtained_marks: 42,
        weightage: '20%',
      },
      {
        id: 'quiz-1',
        name: 'Continuous Assessment Quiz 1',
        max_marks: 20,
        obtained_marks: 17,
        weightage: '15%',
      },
      {
        id: 'mid-term',
        name: 'Mid-Semester Examination',
        max_marks: 100,
        obtained_marks: 82,
        weightage: '30%',
      },
      {
        id: 'end-term',
        name: 'End-Semester Examination',
        max_marks: 100,
        obtained_marks: 86,
        weightage: '35%',
      },
    ],
    teacher_remarks: 'Consistent coursework effort and steady academic progress.',
  };
}

function getEmptyAssessments(subjectCode: string): AssessmentItem[] {
  const { assessments } = getDefaultAssessments(subjectCode);
  return assessments.map((a) => ({
    ...a,
    obtained_marks: 0,
  }));
}

export async function getStudentGrades(user: User) {
  const studentRepo = AppDataSource.getRepository(Student);
  const regRepo = AppDataSource.getRepository(StudentClassRegistration);
  const gradeRepo = AppDataSource.getRepository(GradeCard);

  const student = await studentRepo.findOne({
    where: { user: { identification_number: user.identification_number } },
    relations: { user: true },
  });
  if (!student) throw new HttpError(404, 'Student profile not found');

  // Find all classes this student is registered for
  const registrations = await regRepo.find({
    where: { student: { user_id: student.user_id }, status: 'accepted' },
    relations: { teaching_assignment: { subject: true, teacher: true } },
  });

  const studentName = `${student.first_name} ${student.last_name}`.trim();
  const results: GradeCard[] = [];

  for (const reg of registrations) {
    const ta = reg.teaching_assignment;
    if (!ta || !ta.subject) continue;

    const subjectCode = ta.subject.subject_code;
    const subjectName = ta.subject.subject_name;
    const teacherName = ta.teacher ? `${ta.teacher.first_name} ${ta.teacher.last_name}`.trim() : '';

    let card = await gradeRepo.findOne({
      where: {
        student_id: student.user_id,
        subject_code: subjectCode,
      },
    });

    if (!card) {
      if (student.user_id === '444') {
        // Only student 444 gets the initial default populated grade card
        const { assessments, teacher_remarks } = getDefaultAssessments(subjectCode);
        const totalObtained = assessments.reduce((sum, a) => sum + a.obtained_marks, 0);
        const totalMax = assessments.reduce((sum, a) => sum + a.max_marks, 0);
        const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 1000) / 10 : 0;
        const grade = calculateGrade(percentage);

        card = gradeRepo.create({
          student_id: student.user_id,
          student_name: studentName,
          subject_code: subjectCode,
          subject_name: subjectName,
          teacher_name: teacherName,
          assessments,
          total_obtained: totalObtained,
          total_max: totalMax,
          percentage,
          grade,
          teacher_remarks,
          is_published: true,
        });
        await gradeRepo.save(card);
      } else {
        // Other students start with 'Updating' until the teacher evaluates and updates it
        const assessments = getEmptyAssessments(subjectCode);
        const totalMax = assessments.reduce((sum, a) => sum + a.max_marks, 0);

        card = gradeRepo.create({
          student_id: student.user_id,
          student_name: studentName,
          subject_code: subjectCode,
          subject_name: subjectName,
          teacher_name: teacherName,
          assessments,
          total_obtained: 0,
          total_max: totalMax,
          percentage: 0,
          grade: 'Updating',
          teacher_remarks: 'Grades are currently being updated by the course instructor.',
          is_published: false,
        });
        await gradeRepo.save(card);
      }
    } else {
      let needsSave = false;
      if (student.user_id === '444') {
        if (!card.is_published) {
          card.is_published = true;
          needsSave = true;
        }
        if (card.grade === 'Updating') {
          card.grade = calculateGrade(card.percentage || 90);
          needsSave = true;
        }
      }
      // Ensure names are up to date
      if (card.student_name !== studentName || card.subject_name !== subjectName) {
        card.student_name = studentName;
        card.subject_name = subjectName;
        if (teacherName) card.teacher_name = teacherName;
        needsSave = true;
      }
      if (needsSave) {
        await gradeRepo.save(card);
      }
    }

    results.push(card);
  }

  return results;
}

export async function getSubjectGradesForTeacher(user: User, subjectCode: string) {
  const teacherRepo = AppDataSource.getRepository(Teacher);
  const taRepo = AppDataSource.getRepository(TeachingAssignment);
  const regRepo = AppDataSource.getRepository(StudentClassRegistration);
  const gradeRepo = AppDataSource.getRepository(GradeCard);

  const teacher = await teacherRepo.findOne({
    where: { user: { identification_number: user.identification_number } },
    relations: { user: true },
  });
  if (!teacher) throw new HttpError(404, 'Teacher profile not found');

  // Verify teaching assignment
  const ta = await taRepo.findOne({
    where: {
      teacher: { user_id: teacher.user_id },
      subject: { subject_code: subjectCode },
    },
    relations: { subject: true, teacher: true },
  });

  // Get enrolled students for this subject
  const registrations = await regRepo.find({
    where: {
      teaching_assignment: { subject: { subject_code: subjectCode } },
      status: 'accepted',
    },
    relations: { student: { user: true }, teaching_assignment: { subject: true } },
  });

  const cards: GradeCard[] = [];

  for (const reg of registrations) {
    const student = reg.student;
    if (!student) continue;

    const studentName = `${student.first_name} ${student.last_name}`.trim();
    let card = await gradeRepo.findOne({
      where: {
        student_id: student.user_id,
        subject_code: subjectCode,
      },
    });

    if (!card) {
      if (student.user_id === '444') {
        const { assessments, teacher_remarks } = getDefaultAssessments(subjectCode);
        const totalObtained = assessments.reduce((sum, a) => sum + a.obtained_marks, 0);
        const totalMax = assessments.reduce((sum, a) => sum + a.max_marks, 0);
        const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 1000) / 10 : 0;
        const grade = calculateGrade(percentage);

        card = gradeRepo.create({
          student_id: student.user_id,
          student_name: studentName,
          subject_code: subjectCode,
          subject_name: ta?.subject?.subject_name ?? subjectCode,
          teacher_name: `${teacher.first_name} ${teacher.last_name}`.trim(),
          assessments,
          total_obtained: totalObtained,
          total_max: totalMax,
          percentage,
          grade,
          teacher_remarks,
          is_published: true,
        });
        await gradeRepo.save(card);
      } else {
        const assessments = getEmptyAssessments(subjectCode);
        const totalMax = assessments.reduce((sum, a) => sum + a.max_marks, 0);

        card = gradeRepo.create({
          student_id: student.user_id,
          student_name: studentName,
          subject_code: subjectCode,
          subject_name: ta?.subject?.subject_name ?? subjectCode,
          teacher_name: `${teacher.first_name} ${teacher.last_name}`.trim(),
          assessments,
          total_obtained: 0,
          total_max: totalMax,
          percentage: 0,
          grade: 'Updating',
          teacher_remarks: 'Grades are currently being updated by the course instructor.',
          is_published: false,
        });
        await gradeRepo.save(card);
      }
    } else {
      let needsSave = false;
      if (student.user_id === '444') {
        if (!card.is_published) {
          card.is_published = true;
          needsSave = true;
        }
        if (card.grade === 'Updating') {
          card.grade = calculateGrade(card.percentage || 90);
          needsSave = true;
        }
      }
      if (needsSave) {
        await gradeRepo.save(card);
      }
    }
    cards.push(card);
  }

  return cards;
}

export async function updateStudentGrade(
  user: User,
  subjectCode: string,
  studentId: string,
  payload: {
    assessments?: AssessmentItem[];
    teacher_remarks?: string;
  }
) {
  const gradeRepo = AppDataSource.getRepository(GradeCard);
  const studentRepo = AppDataSource.getRepository(Student);
  const subjectRepo = AppDataSource.getRepository(Subject);
  const teacherRepo = AppDataSource.getRepository(Teacher);

  const teacher = await teacherRepo.findOne({
    where: { user: { identification_number: user.identification_number } },
    relations: { user: true },
  });
  if (!teacher) throw new HttpError(403, 'Only teachers can update grades');

  let card = await gradeRepo.findOne({
    where: {
      student_id: studentId,
      subject_code: subjectCode,
    },
  });

  if (!card) {
    const student = await studentRepo.findOne({ where: { user_id: studentId } });
    const subject = await subjectRepo.findOne({ where: { subject_code: subjectCode } });

    card = gradeRepo.create({
      student_id: studentId,
      student_name: student ? `${student.first_name} ${student.last_name}`.trim() : `Student ${studentId}`,
      subject_code: subjectCode,
      subject_name: subject?.subject_name ?? subjectCode,
      teacher_name: `${teacher.first_name} ${teacher.last_name}`.trim(),
      assessments: [],
      total_obtained: 0,
      total_max: 0,
      percentage: 0,
      grade: 'Updating',
      teacher_remarks: '',
      is_published: false,
    });
  }

  if (Array.isArray(payload.assessments)) {
    card.assessments = payload.assessments.map((a, idx) => ({
      id: a.id || `asg-${idx + 1}`,
      name: a.name || `Assessment ${idx + 1}`,
      max_marks: Number(a.max_marks) || 100,
      obtained_marks: Number(a.obtained_marks) || 0,
      weightage: a.weightage || '0%',
    }));
  }

  if (payload.teacher_remarks !== undefined) {
    card.teacher_remarks = String(payload.teacher_remarks);
  }

  // Recalculate
  const totalObtained = card.assessments.reduce((sum, a) => sum + a.obtained_marks, 0);
  const totalMax = card.assessments.reduce((sum, a) => sum + a.max_marks, 0);
  const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 1000) / 10 : 0;
  const grade = calculateGrade(percentage);

  card.total_obtained = totalObtained;
  card.total_max = totalMax;
  card.percentage = percentage;
  card.grade = grade;
  card.teacher_name = `${teacher.first_name} ${teacher.last_name}`.trim();
  card.is_published = true; // Mark as published when teacher updates it!

  await gradeRepo.save(card);
  return card;
}
