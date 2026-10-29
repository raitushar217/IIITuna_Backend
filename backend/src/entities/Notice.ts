import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Section, Teacher } from '@/entities/User';

@Entity({ name: 'notices' })
export class Notice {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @ManyToMany(() => Section)
  @JoinTable({
    name: 'notice_sections',
    joinColumn: { name: 'notice_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'section_code', referencedColumnName: 'section_code' },
  })
  section!: Section[];

  @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
  teacher!: Teacher;
}

