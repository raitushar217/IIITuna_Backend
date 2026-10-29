import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Section, Student, Teacher, Subject } from '@/entities/User';

@Entity({ name: 'assignments' })
export class Assignment {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @ManyToOne(() => Section, { onDelete: 'CASCADE', nullable: true })
  section?: Section;

  @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
  teacher!: Teacher;

  @ManyToOne(() => Subject, { onDelete: 'CASCADE' })
  subject!: Subject;

  @Column({ type: 'int', nullable: true })
  total_marks!: number | null;

  @Column({ type: 'date' })
  due_date!: string;

  @Column({ type: 'varchar', length: 512 })
  assignment_pdf!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}

@Entity({ name: 'assignment_submissions' })
@Unique(['student', 'assignment'])
export class AssignmentSubmission {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  student!: Student;

  @ManyToOne(() => Assignment, { onDelete: 'CASCADE' })
  assignment!: Assignment;

  @Column({ type: 'int', nullable: true })
  marks!: number | null;

  @Column({ type: 'text', default: '' })
  feedback!: string;

  @Column({ type: 'varchar', length: 30, default: 'submitted' })
  status!: string;

  @Column({ type: 'varchar', length: 512 })
  submission_pdf!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  submitted_at!: Date;
}

