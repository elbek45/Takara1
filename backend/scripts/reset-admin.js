const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function main() {
  const prisma = new PrismaClient();

  // Check if admin exists
  const admin = await prisma.adminUser.findUnique({
    where: { username: 'admin' }
  });

  console.log('Current admin:', admin ? admin.username : 'NOT FOUND');

  const hash = await bcrypt.hash('admin123', 10);

  if (admin) {
    await prisma.adminUser.update({
      where: { username: 'admin' },
      data: { passwordHash: hash }
    });
    console.log('Password updated to: admin123');
  } else {
    await prisma.adminUser.create({
      data: {
        username: 'admin',
        email: 'admin@takaragold.io',
        passwordHash: hash,
        role: 'SUPER_ADMIN',
        isActive: true
      }
    });
    console.log('Admin created with password: admin123');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
