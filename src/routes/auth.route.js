import express from 'express'
import authController from '#controller/auth.controller.js'
import { validate } from '#middleware/validator.middleware.js'
import { loginValidator, forgotPasswordValidator, resetPasswordValidator } from '#validators/auth.validator.js'

const router = express.Router()


router.post('/login',validate(loginValidator), authController.login);
router.post('/register', authController.register);
router.post('/refresh',authController.refresh);
router.post('/forgot-password',validate(forgotPasswordValidator), authController.forgotPassword);
router.post('/reset-password',validate(resetPasswordValidator), authController.resetPassword);
// router.route('/register').post(validate(registerValidator), authController.register);
export default router