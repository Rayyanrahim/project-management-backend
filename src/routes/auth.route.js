import express from 'express'
import authController from '#controller/auth.controller.js'
import userController from '#controller/user.controller.js'
import { validate } from '#middleware/validator.middleware.js'
import { protect } from '#middleware/auth.middleware.js'
import { authRateLimiter, registerRateLimiter } from '#middleware/rateLimiter.middleware.js'
import { loginValidator, forgotPasswordValidator, passwordResetTokenValidator, resetPasswordValidator, verifyOtpValidator } from '#validators/auth.validator.js'

const router = express.Router()
const noStore = (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
};

router.post('/login', authRateLimiter, validate(loginValidator), authController.login);
router.post('/register', registerRateLimiter, authController.register);
router.post('/verify-otp', authRateLimiter, protect, validate(verifyOtpValidator), authController.verifyOtp);
router.post('/refresh', authRateLimiter, authController.refresh);
router.post('/logout', protect, authController.logout);
router.get('/me', protect, userController.me);
router.post('/forgot-password', authRateLimiter, validate(forgotPasswordValidator), authController.forgotPassword);
router.get('/reset-password/:token', noStore, authRateLimiter, validate(passwordResetTokenValidator), authController.validatePasswordResetToken);
router.post('/reset-password', authRateLimiter, validate(resetPasswordValidator), authController.resetPassword);

export default router
