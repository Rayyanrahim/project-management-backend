import { body, param } from 'express-validator';

const companyIdParam = () => param('companyId')
    .matches(/^[1-9]\d{0,18}$/)
    .withMessage('Company ID must be a positive integer')
    .bail()
    .custom((value) => BigInt(value) <= 9223372036854775807n)
    .withMessage('Company ID is out of range');

export const removeCompanyLogoValidator = [companyIdParam()];

export const getCompanyMembersValidator = [companyIdParam()];

export const updateCompanyValidator = [
    companyIdParam(),

    body()
        .custom((value, { req }) => {
            const hasField = value !== null
                && typeof value === 'object'
                && !Array.isArray(value)
                && ['name', 'color', 'logo'].some((field) => Object.hasOwn(value, field));

            if (hasField || req.file) {
                return true;
            }

            throw new Error('Provide at least one of name, color, or logo');
        }),

    body('name')
        .optional()
        .isString()
        .withMessage('Company name must be a string')
        .bail()
        .trim()
        .notEmpty()
        .withMessage('Company name must not be empty')
        .bail()
        .isLength({ max: 255 })
        .withMessage('Company name must not exceed 255 characters'),

    body('color')
        .optional()
        .isString()
        .withMessage('Color must be a string')
        .bail()
        .matches(/^#[0-9a-fA-F]{6}$/)
        .withMessage('Color must be a valid hex code, such as #2563EB'),

    body('logo')
        .optional({ values: 'null' })
        .isString()
        .withMessage('Logo must be a URL or path string')
        .bail()
        .trim()
        .notEmpty()
        .withMessage('Logo must not be empty; use null to remove it')
        .bail()
        .isLength({ max: 500 })
        .withMessage('Logo must not exceed 500 characters'),
];
