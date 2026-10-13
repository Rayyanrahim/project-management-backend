import prisma from '#config/prisma.js';
import AppError from '#utils/AppError.js';

class RoleService {
    async getRoleId(name, db = prisma) {
        const role = await db.role.findUnique({
            where: { name },
        });

        if (!role) {
            throw new AppError('Required role is unavailable.', 503, 'ROLE_NOT_SEEDED');
        }

        return role.id;
    }
}

export default new RoleService();
