import jwt from 'jsonwebtoken';
import config from '#config/config.js';
import AppError from '#utils/AppError.js';
import userService from '#services/user.service.js';
import { verifyToken } from '#utils/jwt.js';

// Run after protect so verification uses the current database user.
export const requireVerified = (req, res, next) => {
    if (!req.user) {
        return next(new AppError('You are not logged in.', 401, 'UNAUTHORIZED'));
    }

    if (!req.user.emailVerifiedAt) {
        return next(new AppError('Please verify your email address.', 403, 'EMAIL_NOT_VERIFIED'));
    }

    next();
};

export const protect = async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken;

        if (!token) {
            throw new AppError(
                'You are not logged in.',
                401,
                'UNAUTHORIZED'
            );
        }

        // const decoded = jwt.verify(
        //     token,
        //     config.JWT_SECRET
        // );

        const decoded = await verifyToken(token, config.JWT_SECRET);

        const currentUser = await userService.getMe(decoded.id);

        if (!currentUser) {
            throw new AppError(
                'User no longer exists.',
                401,
                'UNAUTHORIZED'
            );
        }

        if (!currentUser.isActive) {
            throw new AppError(
                'User account is inactive.',
                401,
                'ACCOUNT_INACTIVE'
            );
        }

        req.user = currentUser;

        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return next(
                new AppError(
                    'Access token expired.',
                    401,
                    'ACCESS_TOKEN_EXPIRED'
                )
            );
        }

        if (error instanceof jwt.JsonWebTokenError) {
            return next(
                new AppError(
                    'Invalid access token.',
                    401,
                    'INVALID_ACCESS_TOKEN'
                )
            );
        }

        next(error);
    }
};
