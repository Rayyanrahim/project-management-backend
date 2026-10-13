import prisma from '#config/prisma.js'
import jwt from 'jsonwebtoken'
import * as CONSTANT from '#constant/constant.js'
import config from '#config/config.js';
import bcrypt from 'bcrypt';
import AppError from '#utils/AppError.js';
import { verifyToken } from '#utils/jwt.js';
import generateAvatarColor from '#utils/generateAvatarColor.js';
import companyUser from '#constant/companyUser.js';
import roleService from '#services/role.service.js';

class UserService {

    async registerUser(userData) {
        const existingEmail = await prisma.user.findUnique({
            where: { email: userData.email }
        });
        if (existingEmail) {
            throw new AppError('Email Already Registered', 422, 'EMAIL_ALREADY_REGISTERED');
        }

        const hashedPassword = await bcrypt.hash(userData.password, Number(config.BCRYPT_SALT_ROUNDS));
        const userColor = generateAvatarColor();
        const companyColor = generateAvatarColor(userColor);

        const result = await prisma.$transaction(async (tx) => {
            const ownerRoleId = await roleService.getRoleId(companyUser.OWNER, tx);

            const user = await tx.user.create({
                data: {
                    name: userData.name,
                    email: userData.email,
                    password: hashedPassword,
                    color: userColor,
                }
            });

            const baseSlug = this.generateSlug(userData.name);
            const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;

            const company = await tx.company.create({
                data: {
                    name: userData.name,
                    slug,
                    ownerId: user.id,
                    color: companyColor,
                },
            });

            await tx.companyUser.create({
                data: {
                    companyId: company.id,
                    userId: user.id,
                    roleId: ownerRoleId,
                    status: companyUser.ACTIVE,
                    joinedAt: new Date(),
                },
            });

            return user.id;
        });

        const user = await prisma.user.findUnique({
            where: {
                id: result,
            },
            include: {
                companyMemberships: {
                    orderBy: { id: 'asc' },
                    include: {
                        company: true,
                    },
                },
            },
        });

        const { password, ...safeUser } = user;

        return safeUser;

    }
    generateSlug(value) {
        return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }

    async loginUser(email, password) {
        // const user = await prisma.user.findUnique({
        //     where: { email },
        // });
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                companyMemberships: {
                    orderBy: { id: 'asc' },
                    include: {
                        company: true,
                    },
                },
            },
        });

        if (!user || !await bcrypt.compare(password, user.password)) {
            throw new AppError('Incorrect email or password.', 422, 'INVALID_CREDENTIALS');
        }

        if (!user.isActive) {
            throw new AppError('User account is inactive.', 403, 'ACCOUNT_INACTIVE');
        }

        user.password = undefined;

        return user;
    }

    generateAccessToken({ userId = null, email = null }) {
        return jwt.sign({ id: String(userId), email }, config.JWT_SECRET, {
            expiresIn: CONSTANT.ACCESS_TOKEN_EXPIRATION,
        });
    }

    async generateRefreshToken({ userId, sessionId }) {
        return jwt.sign({ id: String(userId), sessionId }, config.JWT_REFRESH_SECRET, {
            expiresIn: CONSTANT.REFRESH_TOKEN_EXPIRATION,
        });
    }

    async createAuthSession({ userId, expiresAt }) {
        return prisma.authSession.create({
            data: {
                userId: BigInt(userId),
                expiresAt,
            },
        });
    }

    async getMe(userId) {
        const user = await prisma.user.findUnique({
            where: {
                id: BigInt(userId),
            },
            include: {
                companyMemberships: {
                    orderBy: { id: 'asc' },
                    include: {
                        company: true,
                    },
                },
            },
        });

        if (!user) return null;

        const { password, ...safeUser } = user;
        return safeUser;
    }

    async getUserResponse(user) {
        const { password, companyMemberships = [], ...userDetails } = user;
        const companies = await prisma.company.findMany({
            where: {
                members: {
                    some: { userId: BigInt(user.id), status: companyUser.ACTIVE },
                },
            },
            orderBy: { id: 'asc' },
            include: {
                members: {
                    orderBy: { id: 'asc' },
                    include: {
                        role: true,
                        user: {
                            omit: { password: true },
                        },
                    },
                },
            },
        });

        return {
            ...userDetails,
            companies: companies.map(({ members, ...companyDetails }) => ({
                ...companyDetails,
                company_user: members,
            })),
        };
    }

    async getValidAuthSession(refreshToken) {

        const decoded = await verifyToken(refreshToken, config.JWT_REFRESH_SECRET, 'INVALID_REFRESH_TOKEN');

        const session = await prisma.authSession.findUnique({
            where: {
                id: decoded.sessionId,
            },
            include: {
                user: true,
            },
        });

        if (!session) {
            throw new AppError('Session expired.', 401, 'SESSION_EXPIRED');
        }

        if (session.revokedAt) {
            throw new AppError('Session has been revoked.', 401, 'SESSION_REVOKED');
        }

        if (session.expiresAt <= new Date()) {
            throw new AppError('Session expired.', 401, 'SESSION_EXPIRED');
        }

        if (!session.user.isActive) {
            throw new AppError('User account is inactive.', 403, 'ACCOUNT_INACTIVE');
        }

        return session;
    }

    async updateSessionLastUsed(sessionId) {
        return prisma.authSession.update({
            where: {
                id: sessionId,
            },
            data: {
                lastUsedAt: new Date(),
            },
        });
    }
}

export default new UserService();
