import { body } from 'express-validator';

export const loginValidator = [
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters'),
]


export const forgotPasswordValidator = [
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
];

export const resetPasswordValidator = [

    body('token')
        .notEmpty()
        .withMessage('Reset token is required')
        .matches(/^[a-f0-9]{64}$/i)
        .withMessage('Invalid reset token'),

    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters'),

    body('confirmPassword')
        .notEmpty()
        .withMessage('Confirm password is required')
        .custom((value, { req }) => {

            if (value !== req.body.password) {
                throw new Error(
                    'Password and confirm password do not match'
                );
            }

            return true;
        }),
];