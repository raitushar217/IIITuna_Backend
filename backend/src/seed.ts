import { AppDataSource, initDb } from './config/db';
import {
  User,
  Teacher,
  Subject,
  Program,
  SpecializationBranch,
  Section,
  TeachingAssignment,
  Student,
  StudentClassRegistration,
  ProctoringIncident,
} from './entities/User';
import { Assignment, AssignmentSubmission } from './entities/Assignment';
import { Notice } from './entities/Notice';
import { AttendanceSession, AttendanceEntry } from './entities/Attendance';
import { GradeCard } from './entities/GradeCard';
import bcrypt from 'bcryptjs';

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
  'Shaurya', 'Atharv', 'Advik', 'Pranav', 'Advaith', 'Aaryav', 'Dhruv', 'Kabir', 'Ritvik', 'Darsh',
  'Ananya', 'Diya', 'Gauri', 'Isha', 'Kavya', 'Khushi', 'Myra', 'Navya', 'Pari', 'Prisha',
  'Riya', 'Saanvi', 'Sara', 'Siya', 'Tanvi', 'Vanya', 'Avni', 'Aaditri', 'Ahana', 'Charvi',
  'Rohan', 'Harsh', 'Mohit', 'Sahil', 'Nikhil', 'Manish', 'Kunal', 'Abhishek', 'Gaurav', 'Deepak',
  'Pooja', 'Neha', 'Shweta', 'Sneha', 'Simran', 'Kritika', 'Bhavna', 'Megha', 'Sakshi', 'Palak',
  'Ritik', 'Tushar', 'Aman', 'Ayush', 'Yash', 'Dev', 'Shivam', 'Kartik', 'Chirag', 'Jay',
  'Muskan', 'Nandini', 'Prachi', 'Radhika', 'Rashmi', 'Rachna', 'Saloni', 'Swati', 'Tanya', 'Varsha',
  'Akash', 'Ashish', 'Bipin', 'Chetan', 'Dinesh', 'Hemant', 'Jatin', 'Kamal', 'Lokesh', 'Mayank',
  'Naveen', 'Omkar', 'Piyush', 'Rahul', 'Sanjay', 'Tarun', 'Umesh', 'Vikas', 'Waseem', 'Zayn'
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Reddy', 'Chopra', 'Malhotra', 'Bansal',
  'Rai', 'Roniwal', 'Yadav', 'Mishra', 'Pandey', 'Joshi', 'Thakur', 'Bhatia', 'Kapoor', 'Mehta',
  'Saxena', 'Agrawal', 'Soni', 'Tripathi', 'Tiwari', 'Deshmukh', 'Kulkarni', 'Nair', 'Pillai', 'Menon'
];

async function seed() {
  console.log('--- Initializing Database Connection ---');
  await initDb();

  const userRepo = AppDataSource.getRepository(User);
  const progRepo = AppDataSource.getRepository(Program);
  const branchRepo = AppDataSource.getRepository(SpecializationBranch);
  const secRepo = AppDataSource.getRepository(Section);
  const teacherRepo = AppDataSource.getRepository(Teacher);
  const subRepo = AppDataSource.getRepository(Subject);
  const taRepo = AppDataSource.getRepository(TeachingAssignment);
  const studentRepo = AppDataSource.getRepository(Student);
  const regRepo = AppDataSource.getRepository(StudentClassRegistration);
  const assignmentRepo = AppDataSource.getRepository(Assignment);
  const submissionRepo = AppDataSource.getRepository(AssignmentSubmission);
  const noticeRepo = AppDataSource.getRepository(Notice);
  const attendanceRepo = AppDataSource.getRepository(AttendanceSession);
  const gradeRepo = AppDataSource.getRepository(GradeCard);
  const incidentRepo = AppDataSource.getRepository(ProctoringIncident);

  // 1. Program: BTECH
  let prog = await progRepo.findOne({ where: { program_code: 'BTECH' } });
  if (!prog) {
    prog = progRepo.create({ program_code: 'BTECH', name: 'Bachelor of Technology' });
    await progRepo.save(prog);
  }

  // 2. Branches: CSE, IT, ECE
  const branchConfigs = [
    { code: 'CS', name: 'Computer Science and Engineering', credits: 160 },
    { code: 'IT', name: 'Information Technology', credits: 160 },
    { code: 'EC', name: 'Electronics and Communication Engineering', credits: 160 },
  ];
  const branches: Record<string, SpecializationBranch> = {};
  for (const b of branchConfigs) {
    let branch = await branchRepo.findOne({ where: { specialization_branch_code: b.code } });
    if (!branch) {
      branch = branchRepo.create({
        specialization_branch_code: b.code,
        name: b.name,
        program: prog,
        total_credits: b.credits,
      });
      await branchRepo.save(branch);
    }
    branches[b.code] = branch;
  }

  // 3. Sections: CSE-A, CSE-B, IT-A, EC-A
  const sectionConfigs = [
    { code: 'CS-A', branch: branches['CS'], total: 60 },
    { code: 'CS-B', branch: branches['CS'], total: 60 },
    { code: 'IT-A', branch: branches['IT'], total: 40 },
    { code: 'EC-A', branch: branches['EC'], total: 40 },
  ];
  const sections: Record<string, Section> = {};
  for (const s of sectionConfigs) {
    let sec = await secRepo.findOne({ where: { section_code: s.code } });
    if (!sec) {
      sec = secRepo.create({
        section_code: s.code,
        specialization_branch: s.branch,
        total_students: s.total,
      });
      await secRepo.save(sec);
    }
    sections[s.code] = sec;
  }

  // 4. Create Admin Account: admin / admin123
  let adminUser = await userRepo.findOne({ where: { identification_number: 'admin' } });
  if (!adminUser) {
    adminUser = userRepo.create({
      identification_number: 'admin',
      role: 'admin',
      password_hash: await bcrypt.hash('admin123', 10),
      is_active: true,
      is_staff: true,
      is_superuser: true,
    });
    await userRepo.save(adminUser);
    console.log('✓ Created Admin User (admin / admin123)');
  }

  // 5. 10 Faculty Members with Courses across Semesters & Streams
  const facultyList = [
    {
      id: '111',
      first: 'John',
      last: 'Doe',
      dept: 'School of Computing',
      subCode: 'SUB1',
      subName: 'Mathematics & Linear Algebra',
      credits: 4,
      semester: 1,
      courseType: 'core' as const,
      stream: null,
      section: sections['CS-A'],
      assignmentTitle: 'Calculus & Linear Algebra - Problem Set 1',
      noticeTitle: 'Maths Mid-Term Syllabus & Formula Sheet',
    },
    {
      id: '222',
      first: 'Jane',
      last: 'Smith',
      dept: 'School of Electronics',
      subCode: 'SUB2',
      subName: 'Physics & Electronic Devices',
      credits: 4,
      semester: 1,
      courseType: 'core' as const,
      stream: null,
      section: sections['EC-A'],
      assignmentTitle: 'Semiconductor Physics & Bandgap Analysis',
      noticeTitle: 'Physics Laboratory Schedule - Batch A',
    },
    {
      id: '333',
      first: 'Alan',
      last: 'Turing',
      dept: 'School of Computing',
      subCode: 'SUB3',
      subName: 'Data Structures & Algorithms',
      credits: 4,
      semester: 3,
      courseType: 'core' as const,
      stream: null,
      section: sections['CS-A'],
      assignmentTitle: 'Tree Balancing & Red-Black Tree Implementation',
      noticeTitle: 'Competitive Coding Practice Contest on Codeforces',
    },
    {
      id: 'T104',
      first: 'Sudhir',
      last: 'Sharma',
      dept: 'School of Computing',
      subCode: 'CS502',
      subName: 'Foundations of AI & Machine Learning',
      credits: 3,
      semester: 5,
      courseType: 'stream_elective' as const,
      stream: 'AI_ML',
      section: sections['CS-A'],
      assignmentTitle: 'Gradient Descent & Logistic Regression from Scratch',
      noticeTitle: 'Kaggle Competition Link & Dataset Uploaded',
    },
    {
      id: 'T105',
      first: 'Pankaj',
      last: 'Vyas',
      dept: 'School of Computing',
      subCode: 'CS503',
      subName: 'Big Data Engineering & Analytics',
      credits: 3,
      semester: 5,
      courseType: 'stream_elective' as const,
      stream: 'DATA_SCIENCE',
      section: sections['IT-A'],
      assignmentTitle: 'PySpark Distributed DataFrame Aggregations',
      noticeTitle: 'Apache Spark Cluster Setup Guide on Supabase/GCP',
    },
    {
      id: 'T106',
      first: 'Veena',
      last: 'Khandelwal',
      dept: 'School of Computing',
      subCode: 'CS504',
      subName: 'Network & System Security',
      credits: 3,
      semester: 5,
      courseType: 'stream_elective' as const,
      stream: 'CYBER_SECURITY',
      section: sections['CS-B'],
      assignmentTitle: 'RSA Encryption, Digital Signatures & Wireshark Capture',
      noticeTitle: 'CTF Challenge - Week 4 Registration Open',
    },
    {
      id: 'T107',
      first: 'Vikram',
      last: 'Singh',
      dept: 'School of Electronics',
      subCode: 'EC501',
      subName: 'VLSI Design & Architecture',
      credits: 3,
      semester: 5,
      courseType: 'stream_elective' as const,
      stream: 'VLSI',
      section: sections['EC-A'],
      assignmentTitle: 'CMOS Inverter Sizing & Delay Optimization in Verilog',
      noticeTitle: 'Cadence EDA Tools Lab Login Credentials',
    },
    {
      id: 'T108',
      first: 'Neha',
      last: 'Chauhan',
      dept: 'School of Electronics',
      subCode: 'EC502',
      subName: 'Wireless Sensor Networks & IoT',
      credits: 3,
      semester: 5,
      courseType: 'stream_elective' as const,
      stream: 'COMMUNICATION',
      section: sections['EC-A'],
      assignmentTitle: 'MQTT Sensor Telemetry & ESP32 Firmware Design',
      noticeTitle: 'Hardware Kit Distribution at Electronics Lab-102',
    },
    {
      id: 'T109',
      first: 'Alok',
      last: 'Kumar',
      dept: 'School of Computing',
      subCode: 'CS701',
      subName: 'Cloud Native Microservices & Docker',
      credits: 3,
      semester: 7,
      courseType: 'core' as const,
      stream: null,
      section: sections['CS-A'],
      assignmentTitle: 'Kubernetes Cluster Deployment & Ingress Routing',
      noticeTitle: 'Cloud Credits Voucher for Final Year Projects',
    },
    {
      id: 'T110',
      first: 'Priya',
      last: 'Verma',
      dept: 'Humanities & Social Sciences',
      subCode: 'HS101',
      subName: 'Professional Communication & Ethics',
      credits: 2,
      semester: 1,
      courseType: 'core' as const,
      stream: null,
      section: sections['CS-B'],
      assignmentTitle: 'Technical Report Writing & Literature Review Drafting',
      noticeTitle: 'Group Discussion & Mock Interview Schedule',
    },
  ];

  const teacherEntities: Record<string, Teacher> = {};
  const subjectEntities: Record<string, Subject> = {};
  const taEntities: Record<string, TeachingAssignment> = {};

  console.log('--- Seeding 10 Faculty Members and Courses ---');
  for (const f of facultyList) {
    let user = await userRepo.findOne({ where: { identification_number: f.id } });
    if (!user) {
      user = userRepo.create({
        identification_number: f.id,
        role: 'teacher',
        password_hash: await bcrypt.hash(f.id, 10),
        is_active: true,
      });
      await userRepo.save(user);
    }

    let teacher = await teacherRepo.findOne({ where: { user_id: f.id } });
    if (!teacher) {
      teacher = teacherRepo.create({
        user,
        first_name: f.first,
        last_name: f.last,
        department: f.dept,
      });
      await teacherRepo.save(teacher);
    } else {
      teacher.first_name = f.first;
      teacher.last_name = f.last;
      teacher.department = f.dept;
      await teacherRepo.save(teacher);
    }
    teacherEntities[f.id] = teacher;

    let sub = await subRepo.findOne({ where: { subject_code: f.subCode } });
    const subBranch = f.subCode.startsWith('EC') ? branches['EC'] : branches['CS'];
    if (!sub) {
      sub = subRepo.create({
        subject_code: f.subCode,
        subject_name: f.subName,
        specialization_branch: subBranch,
        credits: f.credits,
        semester: f.semester,
        course_type: f.courseType,
        stream_name: f.stream,
      });
      await subRepo.save(sub);
    } else {
      sub.subject_name = f.subName;
      sub.credits = f.credits;
      sub.semester = f.semester;
      sub.course_type = f.courseType;
      sub.stream_name = f.stream;
      await subRepo.save(sub);
    }
    subjectEntities[f.subCode] = sub;

    let ta = await taRepo.findOne({
      where: { teacher: { user_id: f.id }, subject: { subject_code: f.subCode } },
    });
    if (!ta) {
      ta = taRepo.create({
        teacher,
        subject: sub,
        section: f.section,
        academic_year: '2026-2027',
        semester: f.semester,
      });
      await taRepo.save(ta);
    } else {
      ta.semester = f.semester;
      ta.section = f.section;
      await taRepo.save(ta);
    }
    taEntities[f.subCode] = ta;

    // Faculty Assignment
    let existingAssignment = await assignmentRepo.findOne({
      where: { name: f.assignmentTitle, subject: { subject_code: f.subCode } },
    });
    if (!existingAssignment) {
      existingAssignment = assignmentRepo.create({
        name: f.assignmentTitle,
        description: `Complete assignment exercises for ${f.subName}. Submit step-by-step solution PDF before deadline.`,
        due_date: '2026-11-28',
        total_marks: 50,
        assignment_pdf: 'uploads/demo_assignment.pdf',
        teacher,
        section: f.section,
        subject: sub,
      });
      await assignmentRepo.save(existingAssignment);
    }

    // Faculty Notice
    let existingNotice = await noticeRepo.findOne({
      where: { title: f.noticeTitle, teacher: { user_id: f.id } },
    });
    if (!existingNotice) {
      existingNotice = noticeRepo.create({
        title: f.noticeTitle,
        description: `Official course announcement for ${f.subName}. Please check portal notes and reference material.`,
        section: [f.section],
        teacher,
      });
      await noticeRepo.save(existingNotice);
    }
  }

  // 6. Seed 100 Students (Roll 23101 - 23200) + Test Student 444
  console.log('--- Seeding 100 Students across CSE, IT, ECE (Semesters 1-8) ---');
  const allStudentIds: string[] = [];

  for (let i = 1; i <= 100; i++) {
    const roll = `23${(100 + i).toString()}`; // 23101 to 23200
    allStudentIds.push(roll);

    const firstName = FIRST_NAMES[(i - 1) % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i - 1) % LAST_NAMES.length];

    // Branch & Section Distribution:
    // 23101 - 23145: CSE (CS-A: 1-25, CS-B: 26-45)
    // 23146 - 23175: IT (IT-A)
    // 23176 - 23200: ECE (EC-A)
    let assignedSection = sections['CS-A'];
    if (i > 25 && i <= 45) assignedSection = sections['CS-B'];
    else if (i > 45 && i <= 75) assignedSection = sections['IT-A'];
    else if (i > 75) assignedSection = sections['EC-A'];

    // Semester distribution:
    // 1st Year (Sem 1): i % 4 === 1
    // 2nd Year (Sem 3): i % 4 === 2
    // 3rd Year (Sem 5): i % 4 === 3 (Stream Specialization active!)
    // 4th Year (Sem 7): i % 4 === 0 (Advanced Stream / Capstone)
    let semester = 1;
    if (i % 4 === 2) semester = 3;
    else if (i % 4 === 3) semester = 5;
    else if (i % 4 === 0) semester = 7;

    // Stream assignment for Sem 5 and 7
    let stream: string | null = null;
    if (semester >= 5) {
      if (assignedSection.section_code === 'EC-A') {
        stream = i % 2 === 0 ? 'VLSI' : 'COMMUNICATION';
      } else {
        const streamOptions = ['AI_ML', 'DATA_SCIENCE', 'CYBER_SECURITY'];
        stream = streamOptions[i % 3];
      }
    }

    const cgpa = parseFloat((7.0 + ((i * 7) % 30) / 10).toFixed(2)); // Realistic 7.0 - 9.9 CGPA

    let sUser = await userRepo.findOne({ where: { identification_number: roll } });
    if (!sUser) {
      sUser = userRepo.create({
        identification_number: roll,
        role: 'student',
        password_hash: await bcrypt.hash(roll, 10),
        is_active: true,
      });
      await userRepo.save(sUser);
    }

    let stu = await studentRepo.findOne({ where: { user_id: roll } });
    if (!stu) {
      stu = studentRepo.create({
        user: sUser,
        first_name: firstName,
        last_name: lastName,
        batch: `202${8 - Math.ceil(semester / 2)}`,
        current_semester: semester,
        enrolled_stream: stream,
        cgpa,
        section: assignedSection,
      });
      await studentRepo.save(stu);
    } else {
      stu.first_name = firstName;
      stu.last_name = lastName;
      stu.current_semester = semester;
      stu.enrolled_stream = stream;
      stu.cgpa = cgpa;
      stu.section = assignedSection;
      await studentRepo.save(stu);
    }

    // Register student to their semester courses
    const eligibleCourseCodes: string[] = [];
    if (semester === 1) {
      eligibleCourseCodes.push('SUB1', 'SUB2', 'HS101');
    } else if (semester === 3) {
      eligibleCourseCodes.push('SUB3');
    } else if (semester === 5) {
      if (stream === 'AI_ML') eligibleCourseCodes.push('CS502');
      else if (stream === 'DATA_SCIENCE') eligibleCourseCodes.push('CS503');
      else if (stream === 'CYBER_SECURITY') eligibleCourseCodes.push('CS504');
      else if (stream === 'VLSI') eligibleCourseCodes.push('EC501');
      else if (stream === 'COMMUNICATION') eligibleCourseCodes.push('EC502');
    } else if (semester === 7) {
      eligibleCourseCodes.push('CS701');
    }

    for (const cCode of eligibleCourseCodes) {
      const targetTa = taEntities[cCode];
      if (targetTa) {
        let reg = await regRepo.findOne({
          where: { student: { user_id: roll }, teaching_assignment: { id: targetTa.id } },
        });
        if (!reg) {
          reg = regRepo.create({
            student: stu,
            teaching_assignment: targetTa,
            status: 'accepted',
          });
          await regRepo.save(reg);
        }
      }
    }
  }

  // 7. Seed Test Student 444 (Password: 444) - Sem 5 CSE with AI/ML stream
  console.log('--- Configuring Test Student 444 (CSE Sem 5 AI/ML Track) ---');
  let testUser = await userRepo.findOne({ where: { identification_number: '444' } });
  if (!testUser) {
    testUser = userRepo.create({
      identification_number: '444',
      role: 'student',
      password_hash: await bcrypt.hash('444', 10),
      is_active: true,
    });
    await userRepo.save(testUser);
  } else {
    testUser.password_hash = await bcrypt.hash('444', 10);
    await userRepo.save(testUser);
  }

  let testStudent = await studentRepo.findOne({ where: { user_id: '444' } });
  if (!testStudent) {
    testStudent = studentRepo.create({
      user: testUser,
      first_name: 'Test',
      last_name: 'Student',
      batch: '2026',
      current_semester: 5,
      enrolled_stream: 'AI_ML',
      cgpa: 8.75,
      section: sections['CS-A'],
    });
    await studentRepo.save(testStudent);
  } else {
    testStudent.current_semester = 5;
    testStudent.enrolled_stream = 'AI_ML';
    testStudent.cgpa = 8.75;
    testStudent.section = sections['CS-A'];
    await studentRepo.save(testStudent);
  }

  // Register Student 444 to CS502 (AI/ML) and SUB3
  for (const cCode of ['CS502', 'SUB3']) {
    const targetTa = taEntities[cCode];
    if (targetTa) {
      let reg = await regRepo.findOne({
        where: { student: { user_id: '444' }, teaching_assignment: { id: targetTa.id } },
      });
      if (!reg) {
        reg = regRepo.create({
          student: testStudent,
          teaching_assignment: targetTa,
          status: 'accepted',
        });
        await regRepo.save(reg);
      }
    }
  }

  // 8. Generate Attendance Records across Subjects
  console.log('--- Generating Academic Attendance Sessions & 75% Tracking ---');
  const sampleSubjects = [
    { code: 'SUB1', name: 'Mathematics & Linear Algebra', teacherId: '111', teacherName: 'Dr. John Doe' },
    { code: 'SUB3', name: 'Data Structures & Algorithms', teacherId: '333', teacherName: 'Dr. Alan Turing' },
    { code: 'CS502', name: 'Foundations of AI & Machine Learning', teacherId: 'T104', teacherName: 'Dr. Sudhir Sharma' },
  ];

  const dates = ['2026-10-12', '2026-10-15', '2026-10-19', '2026-10-22', '2026-10-26'];
  for (const sub of sampleSubjects) {
    for (let d = 0; d < dates.length; d++) {
      const dateStr = dates[d];
      let existingSession = await attendanceRepo.findOne({
        where: { subject_code: sub.code, date: dateStr },
      });
      if (!existingSession) {
        const records: AttendanceEntry[] = [];
        let presentCount = 0;

        // Add records for first 25 students + student 444
        const targetStudents = allStudentIds.slice(0, 25).concat(['444']);
        for (let idx = 0; idx < targetStudents.length; idx++) {
          const sId = targetStudents[idx];
          // Intentionally make roll 23103 and 23112 attendance defaulters (< 75%)
          let status: 'present' | 'absent' | 'late' = 'present';
          if (sId === '23103' || sId === '23112') {
            status = d < 4 ? 'absent' : 'present'; // 20% attendance -> Defaulter!
          } else {
            status = (idx + d) % 9 === 0 ? 'absent' : (idx + d) % 13 === 0 ? 'late' : 'present';
          }

          if (status === 'present' || status === 'late') presentCount++;
          records.push({
            student_id: sId,
            student_name: sId === '444' ? 'Test Student' : `Student ${sId}`,
            status,
          });
        }

        existingSession = attendanceRepo.create({
          subject_code: sub.code,
          subject_name: sub.name,
          teacher_id: sub.teacherId,
          teacher_name: sub.teacherName,
          date: dateStr,
          slot: `Lecture ${d + 1}`,
          records,
          total_students: records.length,
          present_count: presentCount,
        });
        await attendanceRepo.save(existingSession);
      }
    }
  }

  // 9. Generate Realistic Grade Cards
  console.log('--- Generating Published Grade Cards & Assessments ---');
  for (const sId of ['444', '23101', '23102', '23103', '23104', '23105']) {
    let existingGrade = await gradeRepo.findOne({
      where: { student_id: sId, subject_code: 'CS502' },
    });
    if (!existingGrade) {
      existingGrade = gradeRepo.create({
        student_id: sId,
        student_name: sId === '444' ? 'Test Student' : `Student ${sId}`,
        subject_code: 'CS502',
        subject_name: 'Foundations of AI & Machine Learning',
        teacher_name: 'Dr. Sudhir Sharma',
        assessments: [
          { id: '1', name: 'Quiz 1 - Math Foundations', max_marks: 20, obtained_marks: 18, weightage: '10%' },
          { id: '2', name: 'Mid-Term Exam', max_marks: 50, obtained_marks: 43, weightage: '30%' },
          { id: '3', name: 'ML Lab Project - Scikit-Learn', max_marks: 30, obtained_marks: 28, weightage: '20%' },
        ],
        total_obtained: 89,
        total_max: 100,
        percentage: 89.0,
        grade: 'A',
        teacher_remarks: 'Outstanding performance in optimization and machine learning algorithms.',
        is_published: true,
      });
      await gradeRepo.save(existingGrade);
    }
  }

  // 10. Generate Proctoring Incidents (Malpractice Flags)
  console.log('--- Generating Mobile Quiz Proctoring Audit Incidents ---');
  const incidents = [
    {
      studentId: '23103',
      studentName: 'Student 23103',
      quizId: '1',
      quizName: 'Data Structures Mid-Term Quiz',
      type: 'app_switch',
      details: 'User navigated away to browser application (chrome) during question 4.',
      status: 'flagged' as const,
    },
    {
      studentId: '23112',
      studentName: 'Student 23112',
      quizId: '2',
      quizName: 'AI & Machine Learning Diagnostic Test',
      type: 'split_screen',
      details: 'Multi-window split screen mode activated during active timer.',
      status: 'flagged' as const,
    },
    {
      studentId: '23120',
      studentName: 'Student 23120',
      quizId: '1',
      quizName: 'Data Structures Mid-Term Quiz',
      type: 'window_blur',
      details: 'Focus lost for 14 seconds. Returned after notification tray interaction.',
      status: 'reviewed' as const,
    },
  ];

  for (const inc of incidents) {
    let existingInc = await incidentRepo.findOne({
      where: { student_id: inc.studentId, quiz_id: inc.quizId },
    });
    if (!existingInc) {
      existingInc = incidentRepo.create({
        student_id: inc.studentId,
        student_name: inc.studentName,
        quiz_id: inc.quizId,
        quiz_name: inc.quizName,
        incident_type: inc.type,
        details: inc.details,
        status: inc.status,
      });
      await incidentRepo.save(existingInc);
    }
  }

  console.log('========================================================================');
  console.log('✓ SEEDING COMPLETED SUCCESSFULLY:');
  console.log('  - 10 Faculty Members with 8-semester course offerings & streams');
  console.log('  - 100 Students (Roll 23101-23200) + Test Student 444 across CSE/IT/ECE');
  console.log('  - Stream Electives Locked for Semesters 5+ (AI/ML, Data Science, Cyber Security, VLSI)');
  console.log('  - Active Attendance Records (with 75% defaulter threshold tracking)');
  console.log('  - Published Grade Cards and Mobile Proctoring Audit Incidents');
  console.log('  - Admin account: admin / admin123');
  console.log('========================================================================');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed execution error:', err);
  process.exit(1);
});
