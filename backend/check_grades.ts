import { AppDataSource } from './src/config/db';
import { GradeCard } from './src/entities/GradeCard';

async function main() {
  await AppDataSource.initialize();
  const card = await AppDataSource.getRepository(GradeCard).findOne({
    where: { student_id: '444', subject_code: 'SUB1' }
  });
  console.log('GRADE CARD IN DB:', JSON.stringify(card, null, 2));
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
