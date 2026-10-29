import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Section, Student, Subject, Teacher } from '@/entities/User';

@Entity({ name: 'quizzes' })
export class Quiz {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'varchar', length: 150 })
  quiz_name!: string;

  @Column({ type: 'text', nullable: true })
  quiz_description!: string | null;

  @ManyToOne(() => Subject, { onDelete: 'CASCADE' })
  quiz_subject!: Subject;

  @ManyToMany(() => Section)
  @JoinTable({
    name: 'quiz_sections',
    joinColumn: { name: 'quiz_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'section_code', referencedColumnName: 'section_code' },
  })
  sections!: Section[];

  @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
  teacher!: Teacher;

  @Column({ type: 'int' })
  total_marks!: number;

  @Column({ type: 'int', default: 60 })
  time_limit_minutes!: number;

  @Column({ type: 'text', nullable: true })
  instructions!: string | null;

  @Column({ type: 'date' })
  due_date!: string;

  @Column({ type: 'timestamptz' })
  start_time!: Date;

  @Column({ type: 'timestamptz' })
  end_time!: Date;

  @Column({ type: 'boolean', default: false })
  is_proctored!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}

export type QuestionType = 'multiple_choice';

@Entity({ name: 'questions' })
export class Question {
  @PrimaryColumn({ type: 'uuid' })
  question_code!: string;

  @ManyToOne(() => Quiz, { onDelete: 'CASCADE' })
  quiz!: Quiz;

  @Column({ type: 'text' })
  question_text!: string;

  @Column({ type: 'varchar', length: 20 })
  question_type!: QuestionType;

  @Column({ type: 'varchar', length: 512, nullable: true })
  image!: string | null;

  @Column({ type: 'uuid', nullable: true })
  correct_option_code!: string | null;

  @Column({ type: 'int', default: 1 })
  marks!: number;

  @Column({ type: 'int', default: 0 })
  order!: number;
}

@Entity({ name: 'question_options' })
export class QuestionOption {
  @PrimaryColumn({ type: 'uuid' })
  option_code!: string;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  related_question!: Question;

  @Column({ type: 'text' })
  text!: string;

  @Column({ type: 'boolean', default: false })
  is_correct!: boolean;
}

@Entity({ name: 'quiz_attempts' })
@Unique(['related_student', 'related_quiz'])
export class QuizAttempt {
  @PrimaryColumn({ type: 'uuid' })
  quiz_attempt_code!: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  related_student!: Student;

  @ManyToOne(() => Quiz, { onDelete: 'CASCADE' })
  related_quiz!: Quiz;

  @CreateDateColumn({ type: 'timestamptz' })
  started_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  ended_at!: Date | null;

  @Column({ type: 'int', default: 0 })
  marks_obtained!: number;

  @Column({ type: 'boolean', default: false })
  is_completed!: boolean;
}

@Entity({ name: 'student_selected_options' })
@Unique(['quiz_attempt', 'question'])
export class StudentSelectedQuestionOption {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @ManyToOne(() => QuizAttempt, { onDelete: 'CASCADE' })
  quiz_attempt!: QuizAttempt;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  question!: Question;

  @ManyToOne(() => QuestionOption, { onDelete: 'CASCADE', nullable: true })
  selected_option!: QuestionOption | null;

  @Column({ type: 'int', default: 0 })
  marks_awarded!: number;
}

