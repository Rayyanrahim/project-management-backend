import prisma from '#config/prisma.js';
import companyInvitation from '#constant/companyInvitation.js';
import companyUser from '#constant/companyUser.js';
import imageKitService from '#services/imagekit.service.js';
import AppError from '#utils/AppError.js';

class CompanyService {
    async getCompanyMembers(companyId) {
        const companyKey = BigInt(companyId);

        const [members, invitations] = await Promise.all([
            prisma.companyUser.findMany({
                where: { companyId: companyKey },
                orderBy: { id: 'asc' },
                include: {
                    role: true,
                    user: { omit: { password: true } },
                },
            }),
            prisma.companyInvitation.findMany({
                where: {
                    companyId: companyKey,
                    status: companyInvitation.PENDING,
                },
                orderBy: { id: 'asc' },
                include: {
                    role: true,
                    inviter: { omit: { password: true } },
                },
            }),
        ]);

        const inviterIds = [...new Set(
            members.map(({ invitedBy }) => invitedBy).filter(Boolean).map(String),
        )];
        const inviteEmails = [...new Set(invitations.map(({ email }) => email))];

        const [inviters, inviteUsers] = await Promise.all([
            inviterIds.length
                ? prisma.user.findMany({
                    where: { id: { in: inviterIds.map(BigInt) } },
                    omit: { password: true },
                })
                : [],
            inviteEmails.length
                ? prisma.user.findMany({
                    where: { email: { in: inviteEmails } },
                    omit: { password: true },
                })
                : [],
        ]);

        const invitersById = new Map(inviters.map((user) => [String(user.id), user]));
        const inviteUsersByEmail = new Map(inviteUsers.map((user) => [user.email, user]));

        const memberUserIds = members.map(({ userId }) => userId);
        const lastActiveRows = memberUserIds.length
            ? await prisma.authSession.groupBy({
                by: ['userId'],
                where: { userId: { in: memberUserIds } },
                _max: { lastUsedAt: true },
            })
            : [];
        const lastActiveByUserId = new Map(
            lastActiveRows.map((row) => [String(row.userId), row._max.lastUsedAt]),
        );

        const memberRows = members.map((member) => ({
            invite: false,
            role: { id: member.role.id, name: member.role.name },
            lastActiveAt: lastActiveByUserId.get(String(member.userId)) ?? null,
            joinedAt: member.joinedAt,
            invitedAt: member.invitedBy ? member.createdAt : null,
            invitedBy: member.invitedBy
                ? invitersById.get(String(member.invitedBy)) ?? null
                : null,
            invitationId: null,
            user: member.user,
        }));

        const invitationRows = invitations.map((invite) => ({
            invite: true,
            email: invite.email,
            role: { id: invite.role.id, name: invite.role.name },
            lastActiveAt: null,
            joinedAt: null,
            invitedAt: invite.createdAt,
            invitedBy: invite.inviter,
            invitationId: invite.id,
            user: inviteUsersByEmail.get(invite.email) ?? null,
        }));

        return {
            members: [...memberRows, ...invitationRows],
        };
    }

    async updateCompany(companyId, companyData, user, logoFile) {
        const data = {};
        for (const field of ['name', 'color', 'logo']) {
            if (Object.hasOwn(companyData, field)) {
                data[field] = companyData[field];
            }
        }

        if (logoFile) {
            const uploaded = await imageKitService.uploadFile(
                logoFile,
                `/companies/${companyId}/logos`,
            );
            data.logo = uploaded.url;
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

    async removeCompanyLogo(companyId, user) {
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
                data: { logo: null },
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
