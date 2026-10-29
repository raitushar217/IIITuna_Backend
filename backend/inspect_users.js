const { AppDataSource } = require('./dist/config/db');
const { User } = require('./dist/entities/User');

async function main() {
  await AppDataSource.initialize();
  const users = await AppDataSource.getRepository(User).find();
  console.log('USERS IN DB:', users.map(u => ({ id: u.identification_number, role: u.role, passwordHash: u.password.substring(0, 10) })));
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
