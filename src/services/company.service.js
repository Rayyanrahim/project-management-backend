import prisma from '#config/prisma.js';
import companyUser from '#constant/companyUser.js';
import AppError from '#utils/AppError.js';

class CompanyService {
    async updateCompany(companyId, companyData, user) {
        const data = {};
        for (const field of ['name', 'color', 'logo']) {
            if (Object.hasOwn(companyData, field)) {
                data[field] = companyData[field];
            }
        }

        try {
            return await prisma.company.update({
                where: {
                    id: BigInt(companyId),
                    ownerId: BigInt(user.id),
                    members: {
                        some: {
                            userId: BigInt(user.id),
                            role: { name: companyUser.OWNER },
                        },
                    },
                },
                data,
            });
        } catch (error) {
            if (error.code === 'P2025') {
                throw new AppError(
                    'Only the company owner can update this company.',
                    403,
                    'COMPANY_UPDATE_FORBIDDEN'
                );
            }
            throw error;
        }
    }
}

export default new CompanyService();
