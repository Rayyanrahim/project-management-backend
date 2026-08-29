import prisma from '#config/prisma.js'
import jwt from 'jsonwebtoken'
import * as CONSTANT from '../constant/constant.js'
import config from '#config/config.js';
import bcrypt from 'bcrypt';
import AppError from '#utils/AppError.js';
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

    async generateRefreshToken({ userId = null }) {
        const token = jwt.sign({ id: userId }, config.JWT_SECRET, {
            expiresIn: CONSTANT.REFRESH_TOKEN_EXPIRATION,
        });

        return token;
    }

}

export default new UserService();