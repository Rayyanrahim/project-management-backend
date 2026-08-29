import prisma from '#config/prisma.js'
import jwt from 'jsonwebtoken'
import * as CONSTANT from '../constant/constant.js'
import config from '#config/config.js';
import bcrypt from 'bcrypt';
import AppError from '#utils/AppError.js';
import { verifyToken } from '#utils/jwt.js';
class UserService {
    async loginUser(email, password) {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user || !await bcrypt.compare(password, user.password)) {
            throw new AppError('Invalid credentials', 422, 'INVALID_CREDENTIALS');
        }

        user.password = undefined;

        return user;
    }

    generateAccessToken({ userId = null, email = null }) {
        return jwt.sign({ id: userId, email }, config.JWT_SECRET, {
            expiresIn: CONSTANT.ACCESS_TOKEN_EXPIRATION,
        });
    }

    async generateRefreshToken({ userId, sessionId }) {
        return jwt.sign({ id: String(userId), sessionId }, config.JWT_REFRESH_SECRET, {
            expiresIn: CONSTANT.REFRESH_TOKEN_EXPIRATION,
        });
    }

    async createAuthSession({ userId, rememberMe, expiresAt }) {
        return prisma.authSession.create({
            data: {
                userId: BigInt(userId),
                rememberMe,
                expiresAt,
            },
        });
    }

    async getMe(userId) {
        return await prisma.user.findUnique({
            where: {
                id: BigInt(userId),
            }
        });
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