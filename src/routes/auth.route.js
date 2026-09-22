import express from 'express'
import authController from '#controller/auth.controller.js'
import userController from '#controller/user.controller.js'
import { validate } from '#middleware/validator.middleware.js'
import { protect } from '#middleware/auth.middleware.js'
import { loginValidator, forgotPasswordValidator, passwordResetTokenValidator, resetPasswordValidator, verifyOtpValidator } from '#validators/auth.validator.js'

const router = express.Router()
const noStore = (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
};

router.post('/login',validate(loginValidator), authController.login);
router.post('/register', authController.register);
router.post('/verify-otp', protect, validate(verifyOtpValidator), authController.verifyOtp);
router.post('/refresh',authController.refresh);
router.post('/logout', protect, authController.logout);
router.get('/me', protect, userController.me);
router.post('/forgot-password',validate(forgotPasswordValidator), authController.forgotPassword);
router.get('/reset-password/:token', noStore, validate(passwordResetTokenValidator), authController.validatePasswordResetToken);
router.post('/reset-password',validate(resetPasswordValidator), authController.resetPassword);
// router.route('/register').post(validate(registerValidator), authController.register);
export default router
