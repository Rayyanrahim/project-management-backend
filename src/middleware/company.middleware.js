import companyUser from '#constant/companyUser.js';
import AppError from '#utils/AppError.js';

export const requireActiveCompany = (req, res, next) => {
    if (!req.user) {
        return next(new AppError('You are not logged in.', 401, 'UNAUTHORIZED'));
    }

    const membership = req.user.companyMemberships?.find(
        ({ companyId, status }) => String(companyId) === req.params.companyId
            && status === companyUser.ACTIVE
    );

    if (!membership) {
        return next(new AppError(
            'An active membership in this company is required.',
            403,
            'ACTIVE_COMPANY_REQUIRED'
        ));
    }

    next();
};
