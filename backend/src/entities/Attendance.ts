import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export interface AttendanceEntry {
  student_id: string;
  student_name: string;
  status: 'present' | 'absent' | 'late';
}

@Entity({ name: 'attendance_sessions' })
export class AttendanceSession {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'varchar', length: 20 })
  subject_code!: string;

  @Column({ type: 'varchar', length: 150 })
  subject_name!: string;

  @Column({ type: 'varchar', length: 50 })
  teacher_id!: string;

  @Column({ type: 'varchar', length: 100, default: '' })
  teacher_name!: string;

  @Column({ type: 'varchar', length: 20 })
  date!: string;

  @Column({ type: 'varchar', length: 50, default: 'Lecture 1' })
  slot!: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  records!: AttendanceEntry[];

  @Column({ type: 'int', default: 0 })
  total_students!: number;

  @Column({ type: 'int', default: 0 })
  present_count!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
