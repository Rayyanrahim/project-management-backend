import express from 'express'
import authController from '#controller/auth.controller.js'
import { validate } from '#middleware/validator.middleware.js'
import { loginValidator } from '#validators/auth.validator.js'

const router = express.Router()


router.post('/login',validate(loginValidator), authController.login);
router.post('/register', authController.register);
router.post('/refresh',authController.refresh);
// router.route('/register').post(validate(registerValidator), authController.register);
export default router