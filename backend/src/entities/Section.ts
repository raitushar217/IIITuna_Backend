import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'section_records' })
export class Section {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  code!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;
}
