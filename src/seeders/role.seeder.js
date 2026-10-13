import companyUser from '#constant/companyUser.js';

const defaultRoles = [companyUser.OWNER, companyUser.ADMIN, companyUser.MEMBER, companyUser.GUEST];

export default async function seedRoles(db) {
    for (const name of defaultRoles) {
        await db.role.upsert({
            where: { name },
            create: { name },
            update: { name },
        });
    }
}
