import prisma from '#config/prisma.js'
import { randomBytes, createHash } from 'node:crypto';
import config from '#config/config.js';
import { FORGOT_PASSWORD_TOKEN_EXPIRATION } from '#constant/constant.js';
import timeStringToSeconds from '#utils/timeUtils.js';
import sendEmail from '#utils/sendEmail.js';
import bcrypt from 'bcrypt';
import AppError from '#utils/AppError.js';

class AuthService {
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
        } catch(error) {
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
