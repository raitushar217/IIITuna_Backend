import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

export type UserRole = 'teacher' | 'student';

@Entity({ name: 'users' })
export class User {
  @PrimaryColumn({ type: 'varchar', length: 15 })
  identification_number!: string;

  @Column({ type: 'varchar', length: 10 })
  role!: UserRole;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'boolean', default: false })
  is_staff!: boolean;

  @Column({ type: 'boolean', default: false })
  is_superuser!: boolean;

  @Column({ type: 'varchar', length: 255 })
  password_hash!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  date_joined!: Date;
}

@Entity({ name: 'auth_tokens' })
@Unique(['key'])
export class AuthToken {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'varchar', length: 128 })
  key!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}

@Entity({ name: 'programs' })
export class Program {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  program_code!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;
}

@Entity({ name: 'specialization_branches' })
export class SpecializationBranch {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  specialization_branch_code!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'int', nullable: true })
  total_credits!: number | null;

  @ManyToOne(() => Program, { onDelete: 'CASCADE' })
  program!: Program;
}

@Entity({ name: 'sections' })
export class Section {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  section_code!: string;

  @ManyToOne(() => SpecializationBranch, { onDelete: 'CASCADE' })
  specialization_branch!: SpecializationBranch;

  @Column({ type: 'int', nullable: true })
  total_students!: number | null;
}

@Entity({ name: 'students' })
export class Student {
  @PrimaryColumn({ type: 'varchar', length: 15 })
  user_id!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'identification_number' })
  user!: User;

  @Column({ type: 'varchar', length: 100 })
  first_name!: string;

  @Column({ type: 'varchar', length: 100 })
  last_name!: string;

  @Column({ type: 'varchar', length: 4 })
  batch!: string;

  @ManyToOne(() => Section, { onDelete: 'CASCADE', nullable: true })
  section?: Section;
}

@Entity({ name: 'teachers' })
export class Teacher {
  @PrimaryColumn({ type: 'varchar', length: 15 })
  user_id!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'identification_number' })
  user!: User;

  @Column({ type: 'varchar', length: 100 })
  first_name!: string;

  @Column({ type: 'varchar', length: 100 })
  last_name!: string;

  @Column({ type: 'varchar', length: 100 })
  department!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  specialization_branch_code!: string | null;
}

@Entity({ name: 'subjects' })
export class Subject {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  subject_code!: string;

  @ManyToOne(() => SpecializationBranch, { onDelete: 'CASCADE' })
  specialization_branch!: SpecializationBranch;

  @Column({ type: 'varchar', length: 100 })
  subject_name!: string;

  @Column({ type: 'int', nullable: true })
  credits!: number | null;
}

@Entity({ name: 'teaching_assignments' })
@Unique(['teacher', 'section', 'subject', 'academic_year', 'semester'])
export class TeachingAssignment {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
  teacher!: Teacher;

  @ManyToOne(() => Section, { onDelete: 'CASCADE' })
  section!: Section;

  @ManyToOne(() => Subject, { onDelete: 'CASCADE' })
  subject!: Subject;

  @Column({ type: 'varchar', length: 15 })
  academic_year!: string;

  @Column({ type: 'int' })
  semester!: number;
}

@Entity({ name: 'student_class_registrations' })
@Unique(['student', 'teaching_assignment'])
export class StudentClassRegistration {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  student!: Student;

  @ManyToOne(() => TeachingAssignment, { onDelete: 'CASCADE' })
  teaching_assignment!: TeachingAssignment;

  @Column({ type: 'varchar', length: 20, default: 'accepted' })
  status!: 'pending' | 'accepted' | 'rejected';

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}


