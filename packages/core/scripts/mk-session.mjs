import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const user = await prisma.user.findFirst({ where: { email: 'admin@ultraia.local' } });
if (!user) throw new Error('admin not found');
const token = randomBytes(32).toString('base64url');
await prisma.session.create({
  data: { token, userId: user.id, expiresAt: new Date(Date.now() + 30 * 864e5) },
});
console.log(token);
await prisma.$disconnect();