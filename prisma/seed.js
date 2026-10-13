import prisma from '#config/prisma.js';
import seedRoles from '#seeders/role.seeder.js';

try {
    await prisma.$transaction(tx => seedRoles(tx));
    console.log('Seeded global roles: OWNER, ADMIN, MEMBER, GUEST.');
} catch (error) {
    console.error('Role seeding failed:', error.message);
    process.exitCode = 1;
} finally {
    await prisma.$disconnect();
}
