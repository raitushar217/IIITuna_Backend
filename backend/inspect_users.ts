import { AppDataSource } from './src/config/db';
import { User } from './src/entities/User';
import bcrypt from 'bcryptjs';

async function main() {
  await AppDataSource.initialize();
  const userRepo = AppDataSource.getRepository(User);
  const u111 = await userRepo.findOne({ where: { identification_number: '111' } });
  if (u111) {
    u111.password_hash = await bcrypt.hash('password123', 10);
    await userRepo.save(u111);
    console.log('Updated 111 teacher password to password123!');
  }
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
