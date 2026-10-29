import { AppDataSource, initDb } from './config/db';
import { User, Teacher, Subject, Program, SpecializationBranch, Section, TeachingAssignment, Student, StudentClassRegistration } from './entities/User';
import { Assignment } from './entities/Assignment';
import { Notice } from './entities/Notice';
import bcrypt from 'bcryptjs';

async function seed() {
  await initDb();
  
  // Create Program
  const progRepo = AppDataSource.getRepository(Program);
  let prog = await progRepo.findOne({ where: { program_code: 'BTECH' } });
  if (!prog) {
    prog = progRepo.create({ program_code: 'BTECH', name: 'Bachelor of Technology' });
    await progRepo.save(prog);
  }

  // Create Branch
  const branchRepo = AppDataSource.getRepository(SpecializationBranch);
  let branch = await branchRepo.findOne({ where: { specialization_branch_code: 'CS' } });
  if (!branch) {
    branch = branchRepo.create({ specialization_branch_code: 'CS', name: 'Computer Science', program: prog, total_credits: 160 });
    await branchRepo.save(branch);
  }

  // Create Section
  const secRepo = AppDataSource.getRepository(Section);
  let sec = await secRepo.findOne({ where: { section_code: 'CS-A' } });
  if (!sec) {
    sec = secRepo.create({ section_code: 'CS-A', specialization_branch: branch, total_students: 60 });
    await secRepo.save(sec);
  }

  const userRepo = AppDataSource.getRepository(User);
  const teacherRepo = AppDataSource.getRepository(Teacher);
  const subRepo = AppDataSource.getRepository(Subject);
  const taRepo = AppDataSource.getRepository(TeachingAssignment);
  const studentRepo = AppDataSource.getRepository(Student);
  const assignmentRepo = AppDataSource.getRepository(Assignment);
  const noticeRepo = AppDataSource.getRepository(Notice);

  // 3 Teachers & 3 Classes/Subjects
  const teachers = [
    {
      id: '111',
      first: 'John',
      last: 'Doe',
      subCode: 'SUB1',
      subName: 'Mathematics',
      credits: 4,
      assignment: {
        name: 'Calculus & Linear Algebra - Problem Set 1',
        description: 'Solve problem set 1-10 on Fourier transforms, eigenvalues, and matrices.',
        due_date: '2026-11-15',
        total_marks: 50,
      },
      notice: {
        title: 'Maths Mid-Term Syllabus & Notes Released',
        description: 'Unit 1 & Unit 2 problem sets are uploaded. Kindly review before next class.',
      },
    },
    {
      id: '222',
      first: 'Jane',
      last: 'Smith',
      subCode: 'SUB2',
      subName: 'Physics',
      credits: 4,
      assignment: {
        name: 'Electromagnetism & Wave Optics Assignment',
        description: 'Derive Maxwell equations and analyze optical diffraction patterns.',
        due_date: '2026-11-20',
        total_marks: 50,
      },
      notice: {
        title: 'Physics Lab Session Schedule',
        description: 'Lab experiment 3 will be conducted this Wednesday in Lab-204.',
      },
    },
    {
      id: '333',
      first: 'Alan',
      last: 'Turing',
      subCode: 'SUB3',
      subName: 'Computer Science',
      credits: 4,
      assignment: {
        name: 'Data Structures Lab 1 - Balanced Trees',
        description: 'Implement Red-Black tree insertion, deletion, and tree balancing verification tests.',
        due_date: '2026-11-25',
        total_marks: 100,
      },
      notice: {
        title: 'Data Structures Project Guidelines',
        description: 'Project submissions must include unit tests and time complexity analysis.',
      },
    },
  ];

  for (const t of teachers) {
    let user = await userRepo.findOne({ where: { identification_number: t.id } });
    if (!user) {
      user = userRepo.create({
        identification_number: t.id,
        role: 'teacher',
        password_hash: await bcrypt.hash(t.id, 10),
        is_active: true,
        is_staff: false,
        is_superuser: false,
      });
      await userRepo.save(user);
    } else {
      user.password_hash = await bcrypt.hash(t.id, 10);
      await userRepo.save(user);
    }
    
    let teacher = await teacherRepo.findOne({ where: { user_id: t.id } });
    if (!teacher) {
      teacher = teacherRepo.create({
        user,
        first_name: t.first,
        last_name: t.last,
        department: 'Science & Engineering',
      });
      await teacherRepo.save(teacher);
    }

    let sub = await subRepo.findOne({ where: { subject_code: t.subCode } });
    if (!sub) {
      sub = subRepo.create({ subject_code: t.subCode, subject_name: t.subName, specialization_branch: branch, credits: t.credits });
      await subRepo.save(sub);
    } else {
      sub.subject_name = t.subName;
      sub.credits = t.credits;
      await subRepo.save(sub);
    }

    let ta = await taRepo.findOne({ where: { teacher: { user_id: t.id }, subject: { subject_code: t.subCode } } });
    if (!ta) {
      ta = taRepo.create({ teacher, subject: sub, section: sec, academic_year: '2026-2027', semester: 1 });
      await taRepo.save(ta);
    } else {
      ta.academic_year = '2026-2027';
      ta.semester = 1;
      ta.section = sec;
      await taRepo.save(ta);
    }

    // Demo Assignment
    let existingAssignment = await assignmentRepo.findOne({
      where: { name: t.assignment.name, subject: { subject_code: t.subCode } },
    });
    if (!existingAssignment) {
      existingAssignment = assignmentRepo.create({
        name: t.assignment.name,
        description: t.assignment.description,
        due_date: t.assignment.due_date,
        total_marks: t.assignment.total_marks,
        assignment_pdf: 'uploads/demo_assignment.pdf',
        teacher,
        section: sec,
        subject: sub,
      });
      await assignmentRepo.save(existingAssignment);
    }

    // Demo Notice
    let existingNotice = await noticeRepo.findOne({
      where: { title: t.notice.title, teacher: { user_id: t.id } },
    });
    if (!existingNotice) {
      existingNotice = noticeRepo.create({
        title: t.notice.title,
        description: t.notice.description,
        section: [sec],
        teacher,
      });
      await noticeRepo.save(existingNotice);
    }
  }

  // Student 444 (password: 444)
  let sUser = await userRepo.findOne({ where: { identification_number: '444' } });
  if (!sUser) {
    sUser = userRepo.create({
      identification_number: '444',
      role: 'student',
      password_hash: await bcrypt.hash('444', 10),
      is_active: true,
      is_staff: false,
      is_superuser: false,
    });
    await userRepo.save(sUser);
  } else {
    sUser.password_hash = await bcrypt.hash('444', 10);
    await userRepo.save(sUser);
  }

  let student = await studentRepo.findOne({ where: { user_id: '444' } });
  if (!student) {
    student = studentRepo.create({
      user: sUser,
      first_name: 'Test',
      last_name: 'Student',
      batch: '2026',
      section: sec,
    });
    await studentRepo.save(student);
  }

  // Clear existing student registrations for student 444 to ensure they start unregistered
  const regRepo = AppDataSource.getRepository(StudentClassRegistration);
  await regRepo.delete({ student: { user_id: '444' } });

  console.log('Seed completed successfully with 3 Teachers, 3 Subjects, Demo Assignments & Notes.');
  process.exit(0);
}

seed().catch(console.error);
