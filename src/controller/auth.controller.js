import { formatResponse } from '#utils/response.js'
import timeStringToSeconds from '#utils/timeUtils.js'
import * as CONSTANT from '../constant/constant.js'
import userService from '#services/user.service.js'
import authService from '#services/auth.service.js';
import config from '#config/config.js';
import AppError from '#utils/AppError.js';

class AuthController {
    logout = async (req, res) => {
        await authService.logout(req.cookies?.refreshToken, req.user.id);
        authService.clearAuthCookies(res);
        return formatResponse(res, 200, 'Logged out successfully.', null, 'LOGOUT_SUCCESSFULLY');
    };

    register = async (req, res) => {
        const user = await userService.registerUser(req.body);
        const verification = await authService.generateOtp(user);
        await authService.setAuthCookies(res, user);

        return formatResponse(res, 200, 'Registered successfully. OTP sent for verification.', { ...user, verification }, 'REGISTER_SUCCESSFULLY');
    };

    login = async (req, res) => {
        const { email, password } = req.body;
        const user = await userService.loginUser(email, password);
        const verification = await authService.generateOtp(user);
        await authService.setAuthCookies(res, user);

        return formatResponse(res, 200, 'Logged in successfully.', { ...user, verification }, 'LOGIN_SUCCESSFULLY');
    };

    verifyOtp = async (req, res) => {
        const { user, verification } = await authService.verifyOtp({ userId: req.user.id, otp: req.body.otp });
        await authService.setAuthCookies(res, user);

        return formatResponse(res, 200, 'OTP verified successfully.', { ...user, verification }, 'OTP_VERIFIED');
    };

    refresh = async (req, res) => {
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            throw new AppError('Session expired.', 401, 'SESSION_EXPIRED');
        }

        const session = await userService.getValidAuthSession(refreshToken);

        const accessToken = userService.generateAccessToken({ userId: session.user.id, email: session.user.email });

        const accessExpirySecs = timeStringToSeconds(CONSTANT.ACCESS_TOKEN_EXPIRATION);

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: config.APP_ENV === 'production',
            sameSite: 'lax',
            maxAge: accessExpirySecs * 1000,
        });

        await userService.updateSessionLastUsed(session.id);

        return formatResponse(res, 200, 'Token refreshed successfully', null, 'TOKEN_REFRESHED');
    };

    forgotPassword = async (req, res) => {
        const { email } = req.body;
        await authService.forgotPassword(email);

        return formatResponse(res, 200, 'If an account with that email exists, a password reset link has been sent.', null, 'FORGOT_PASSWORD_EMAIL_SENT');
    };

    resetPassword = async (req, res) => {
        const { token, password } = req.body;
        await authService.resetPassword(token, password);

        return formatResponse(res, 200, 'Password reset successfully.', null, 'PASSWORD_RESET_SUCCESSFUL');
    }
}
export default new AuthController();
