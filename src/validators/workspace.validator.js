import { body } from 'express-validator';
import prisma from '#config/prisma.js';
import companyUser from '#constant/companyUser.js';

export const createWorkspaceValidator = [
    body('name')
        .exists()
        .withMessage('Workspace name is required')
        .bail()
        .isString()
        .withMessage('Workspace name must be a string')
        .bail()
        .trim()
        .notEmpty()
        .withMessage('Workspace name is required')
        .bail()
        .isLength({ max: 255 })
        .withMessage('Workspace name must not exceed 255 characters')
        .bail()
        .custom(async (name, { req }) => {
            const membership = req.user?.companyMemberships?.find(
                ({ status }) => status === companyUser.ACTIVE
            );

            if (!membership?.companyId) {
                throw new Error('An active company membership is required');
            }

            const existingWorkspace = await prisma.workspace.findFirst({
                where: {
                    companyId: BigInt(membership.companyId),
                    name: { equals: name, mode: 'insensitive' },
                },
                select: { id: true },
            });

            if (existingWorkspace) {
                throw new Error('Workspace name already exists in this company');
            }

            return true;
        }),

    body('icon')
        .optional({ values: 'null' })
        .isString()
        .withMessage('Icon must be a string')
        .bail()
        .trim()
        .notEmpty()
        .withMessage('Icon must not be empty')
        .bail()
        .isLength({ max: 255 })
        .withMessage('Icon must not exceed 255 characters'),

    body('color')
        .optional()
        .isString()
        .withMessage('Color must be a string')
        .bail()
        .matches(/^#[0-9a-fA-F]{6}$/)
        .withMessage('Color must be a valid hex code, such as #2563EB'),

    body('description')
        .optional()
        .isString()
        .withMessage('Description must be a string')
        .bail()
        .trim(),

    body('isPrivate')
        .optional()
        .custom((value) => typeof value === 'boolean')
        .withMessage('isPrivate must be a boolean'),
];
