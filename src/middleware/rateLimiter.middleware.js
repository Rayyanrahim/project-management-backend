import rateLimit from 'express-rate-limit';
import AppError from '#utils/AppError.js';

const createRateLimiter = ({ windowMs, max, message, messageCode }) => {
    const limiter = rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (_req, _res, next) => {
            next(new AppError(message, 429, messageCode));
        },
    });

    return (req, res, next) => {
        if (process.env.NODE_ENV === 'testing') {
            return next();
        }

        return limiter(req, res, next);
    };
};

export const registerRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 5,
    message: 'Too many registration attempts from this IP, please try again in a minute.',
    messageCode: 'REGISTER_RATE_LIMIT_EXCEEDED',
});

export const authRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Too many authentication attempts from this IP, please try again later.',
    messageCode: 'AUTH_RATE_LIMIT_EXCEEDED',
});

export const generalRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
    messageCode: 'RATE_LIMIT_EXCEEDED',
});
