import jwt from 'jsonwebtoken';
import AppError from '#utils/AppError.js';

export const verifyToken = (token, secret, errorCode = 'INVALID_TOKEN') => {
    return new Promise((resolve, reject) => {
        jwt.verify(token, secret, (error, decoded) => {
            if (error) {
                return reject(
                    new AppError(
                        'Invalid or expired token.',
                        401,
                        errorCode
                    )
                );
            }

            resolve(decoded);
        });
    });
};