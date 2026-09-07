import prisma from '#config/prisma.js'
import { randomBytes, createHash } from 'node:crypto';
import config from '#config/config.js';
import { ACCESS_TOKEN_EXPIRATION, REFRESH_TOKEN_EXPIRATION, FORGOT_PASSWORD_TOKEN_EXPIRATION, VERIFICATION_TOKEN_EXPIRATION, OTP_LENGTH } from '#constant/constant.js';
import verificationStatus from '#constant/verification.js';
import createOtpCode from '#utils/generateOtp.js';
import timeStringToSeconds from '#utils/timeUtils.js';
import sendEmail from '#utils/sendEmail.js';
import userService from '#services/user.service.js';
import bcrypt from 'bcrypt';
import AppError from '#utils/AppError.js';

class AuthService {
    async logout(refreshToken, userId) {
        const session = await userService.getValidAuthSession(refreshToken);
        await prisma.authSession.deleteMany({
            where: {
                id: session.id,
                userId: BigInt(userId),
            },
        });
    }

    clearAuthCookies(res) {
        const options = {
            httpOnly: true,
            secure: config.APP_ENV === 'production',
            sameSite: 'lax',
        };
        res.clearCookie('accessToken', { ...options, path: '/' });
        res.clearCookie('refreshToken', { ...options, path: '/api/v1/auth' });
        res.clearCookie('refreshToken', { ...options, path: '/api/auth' });
    }

    async setAuthCookies(res, user) {
        const accessExpirySecs = timeStringToSeconds(ACCESS_TOKEN_EXPIRATION);
        const refreshExpirySecs = timeStringToSeconds(REFRESH_TOKEN_EXPIRATION);

        const session = await userService.createAuthSession({
            userId: user.id,
            expiresAt: new Date(Date.now() + refreshExpirySecs * 1000),
        });

        const accessToken = userService.generateAccessToken({
            userId: user.id,
            email: user.email,
        });
        const refreshToken = await userService.generateRefreshToken({
            userId: user.id,
            sessionId: session.id,
        });

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: config.APP_ENV === 'production',
            sameSite: 'lax',
            maxAge: accessExpirySecs * 1000,
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: config.APP_ENV === 'production',
            sameSite: 'lax',
            path: '/api/v1/auth',
            maxAge: refreshExpirySecs * 1000,
        });
    }

    async generateOtp(user) {
        if (!user.isActive) {
            throw new AppError('User account is inactive.', 403, 'ACCOUNT_INACTIVE');
        }

        const otp = createOtpCode();
        const token = await bcrypt.hash(otp, Number(config.BCRYPT_SALT_ROUNDS));
        const expiryMinutes = timeStringToSeconds(VERIFICATION_TOKEN_EXPIRATION) / 60;

        const verification = await prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT id FROM users WHERE id = ${user.id} FOR UPDATE`;

            const existingVerification = await tx.verification.findUnique({
                where: { userId: user.id },
            });

            if (!existingVerification) {
                return tx.verification.create({
                    data: {
                        userId: user.id,
                        email: user.email,
                        token,
                        status: verificationStatus.PENDING,
                    },
                });
            }

            return tx.verification.update({
                where: { id: existingVerification.id },
                data: {
                    email: user.email,
                    token,
                    status: verificationStatus.PENDING,
                    createdAt: new Date(),
                },
            });
        });

        try {
            await sendEmail({
                to: user.email,
                subject: 'Your verification code',
                text: `Your verification code is ${otp}. It expires in ${expiryMinutes} minutes.`,
            });
        } catch {
            await prisma.verification.update({
                where: { id: verification.id },
                data: { status: verificationStatus.EXPIRED },
            });
            throw new AppError('Unable to send verification email. Please log in to try again.', 500, 'OTP_EMAIL_FAILED');
        }

        const { token: _token, ...safeVerification } = verification;

        return {
            ...safeVerification,
            id: String(verification.id),
            userId: String(verification.userId),
        };
    }

    async verifyOtp({ userId, otp }) {
        if (!userId || typeof otp !== 'string' || !new RegExp(`^\\d{${OTP_LENGTH}}$`).test(otp)) {
            throw new AppError('OTP is invalid, expired, or already used.', 400, 'INVALID_OTP');
        }

        const expiryMs = timeStringToSeconds(VERIFICATION_TOKEN_EXPIRATION) * 1000;

        const result = await prisma.$transaction(async (tx) => {
            const verification = await tx.verification.findUnique({
                where: { userId: BigInt(userId) },
            });

            if (!verification || verification.status !== verificationStatus.PENDING || !verification.token) {
                return null;
            }

            await tx.$queryRaw`SELECT id FROM users WHERE id = ${verification.userId} FOR UPDATE`;

            const user = await tx.user.findUnique({
                where: { id: verification.userId },
            });

            if (!user?.isActive || user.email !== verification.email) {
                return null;
            }

            const isExpired = verification.createdAt.getTime() + expiryMs <= Date.now();
            if (isExpired) {
                const expiredVerification = await tx.verification.update({
                    where: { id: verification.id },
                    data: {
                        status: verificationStatus.EXPIRED,
                    },
                });

                return { expired: true, verification: expiredVerification };
            }

            const isValidOtp = await bcrypt.compare(otp, verification.token);
            if (!isValidOtp) {
                return null;
            }

            const verifiedRecord = await tx.verification.update({
                where: { id: verification.id },
                data: {
                    status: verificationStatus.VERIFIED,
                    token: null,
                },
            });

            const verifiedUser = await tx.user.update({
                where: { id: user.id },
                data: {
                    emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
                },
                include: {
                    workspaceMemberships: {
                        include: { workspace: true },
                    },
                },
            });

            const { password, ...safeUser } = verifiedUser;
            const { token: _token, ...safeVerification } = verifiedRecord;

            return {
                user: safeUser,
                verification: {
                    ...safeVerification,
                    id: String(verifiedRecord.id),
                    userId: String(verifiedRecord.userId),
                },
            };
        });

        if (!result) {
            throw new AppError('OTP is invalid, expired, or already used. Log in to request a new code.', 400, 'INVALID_OTP');
        }

        if (result.expired) {
            throw new AppError('OTP has expired. Please log in again to request a new code.', 400, 'OTP_EXPIRED');
        }

        return result;
    }

    async forgotPassword(email) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) return;

        let resetUrl;
        try {
            resetUrl = new URL(config.PASSWORD_RESET_URL);
            if (!['http:', 'https:'].includes(resetUrl.protocol)) throw new Error();
        } catch {
            throw new AppError('Password reset URL is not configured', 500, 'PASSWORD_RESET_NOT_CONFIGURED');
        }

        const token = randomBytes(32).toString('hex');
        const tokenHash = createHash('sha256').update(token).digest('hex');
        const expirySeconds = timeStringToSeconds(FORGOT_PASSWORD_TOKEN_EXPIRATION);
        resetUrl.searchParams.set('token', token);

        await prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                token: tokenHash,
                expiresAt: new Date(Date.now() + expirySeconds * 1000),
            },
        });

        try {
            await sendEmail({
                to: user.email,
                subject: 'Reset your password',
                text: `Use this link to reset your password:\n${resetUrl.toString()}\n\nThis link expires in ${expirySeconds / 60} minutes. If you did not request a password reset, you can ignore this email.`,
            });
        } catch (error) {
            await prisma.passwordResetToken.deleteMany({ where: { token: tokenHash } });
            throw new AppError('Unable to send password reset email. Please try again.', 500, 'PASSWORD_RESET_EMAIL_FAILED');
        }
    }

    async resetPassword(token, newPassword) {
        const tokenHash = createHash('sha256').update(token).digest('hex');

        const resetToken = await prisma.passwordResetToken.findUnique({
            where: {
                token: tokenHash,
            },
            include: {
                user: true,
            },
        });

        if (!resetToken || resetToken.expiresAt < new Date() || !resetToken.user.isActive || !resetToken.user) {
            throw new AppError('Password reset token is invalid or has expired.', 400, 'INVALID_PASSWORD_RESET_TOKEN');
        }

        const hashedPassword = await bcrypt.hash(newPassword, Number(config.BCRYPT_SALT_ROUNDS));

        await prisma.$transaction(async (tx) => {

            const deletedToken = await tx.passwordResetToken.deleteMany({
                where: {
                    id: resetToken.id,
                    token: tokenHash,
                    expiresAt: {
                        gt: new Date(),
                    },
                },
            });

            if (deletedToken.count !== 1) {
                throw new AppError('Password reset token is invalid or has expired.', 400, 'INVALID_PASSWORD_RESET_TOKEN');
            }

            await tx.user.update({
                where: {
                    id: resetToken.userId,
                },
                data: {
                    password: hashedPassword,
                },
            });

            await tx.passwordResetToken.deleteMany({
                where: {
                    userId: resetToken.userId,
                },
            });
        });

        return true;
    }
}

export default new AuthService();
