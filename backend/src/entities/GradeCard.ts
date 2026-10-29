import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

export interface AssessmentItem {
  id: string;
  name: string;
  max_marks: number;
  obtained_marks: number;
  weightage: string;
}

@Entity({ name: 'grade_cards' })
@Unique(['student_id', 'subject_code'])
export class GradeCard {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'varchar', length: 15 })
  student_id!: string;

  @Column({ type: 'varchar', length: 100 })
  student_name!: string;

  @Column({ type: 'varchar', length: 20 })
  subject_code!: string;

  @Column({ type: 'varchar', length: 150 })
  subject_name!: string;

  @Column({ type: 'varchar', length: 100, default: '' })
  teacher_name!: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  assessments!: AssessmentItem[];

  @Column({ type: 'float', default: 0 })
  total_obtained!: number;

  @Column({ type: 'float', default: 0 })
  total_max!: number;

  @Column({ type: 'float', default: 0 })
  percentage!: number;

  @Column({ type: 'varchar', length: 20, default: 'Updating' })
  grade!: string;

  @Column({ type: 'text', default: '' })
  teacher_remarks!: string;

  @Column({ type: 'boolean', default: false })
  is_published!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
