import { randomUUID } from 'node:crypto';
import prisma from '#config/prisma.js';
import companyUser from '#constant/companyUser.js';
import AppError from '#utils/AppError.js';
import generateAvatarColor from '#utils/generateAvatarColor.js';

class WorkspaceService {
    async createWorkspace(workspaceData, user) {
        const membership = user.companyMemberships?.find(
            ({ status }) => status === companyUser.ACTIVE
        );

        if (!membership?.companyId) {
            throw new AppError('An active company membership is required.', 403, 'ACTIVE_COMPANY_REQUIRED');
        }

        const { name, icon, color, description, isPrivate } = workspaceData;
        const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'workspace';
        const slug = `${baseSlug.slice(0, 218).replace(/-+$/g, '')}-${randomUUID()}`;

        try {
            return await prisma.workspace.create({
                data: {
                    companyId: BigInt(membership.companyId),
                    createdBy: BigInt(user.id),
                    name,
                    slug,
                    icon: icon ?? null,
                    color: color ?? generateAvatarColor(),
                    description: description ?? null,
                    isPrivate: isPrivate ?? false,
                },
            });
        } catch (error) {
            if (error.code === 'P2002') {
                throw new AppError('Workspace already exists in this company.', 409, 'WORKSPACE_ALREADY_EXISTS');
            }
            throw error;
        }
    }
}

export default new WorkspaceService();
