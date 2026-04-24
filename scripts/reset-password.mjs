import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const EMAIL = 'deefy07@gmail.com';
const NEW_PASSWORD = 'Bilula@2025';

const hash = await bcrypt.hash(NEW_PASSWORD, 12);

const user = await prisma.user.update({
  where: { email: EMAIL },
  data: { password: hash },
});

console.log(`✅ Senha resetada para: ${EMAIL}`);
console.log(`   Nova senha: ${NEW_PASSWORD}`);

await prisma.$disconnect();
