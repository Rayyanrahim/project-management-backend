import { formatResponse } from '#utils/response.js'
import timeStringToSeconds from '#utils/timeUtils.js'
import * as CONSTANT from '../constant/constant.js'
import userService from '#services/user.service.js'
import authService from '#services/auth.service.js';
import config from '#config/config.js';
class AuthController {
    register = async (req, res) => {
        const user = await userService.registerUser(req.body);

        const accessExpirySecs = timeStringToSeconds(CONSTANT.ACCESS_TOKEN_EXPIRATION);
        const refreshExpirySecs = timeStringToSeconds(CONSTANT.REFRESH_TOKEN_EXPIRATION);

        const session = await userService.createAuthSession({
            userId: user.id,
            expiresAt: new Date(
                Date.now() + refreshExpirySecs * 1000
            ),
        });

        const accessToken = userService.generateAccessToken({ userId: user.id, email: user.email });
        const refreshToken = userService.generateRefreshToken({ userId: user.id, sessionId: session.id });

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: config.APP_ENV === 'production',
            sameSite: 'lax',
            maxAge: accessExpirySecs * 1000,
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: config.APP_ENV === 'production',
            sameSite: 'lax',
            path: '/api/auth',
            maxAge: refreshExpirySecs * 1000,
        });

        return formatResponse(res, 200, 'Registered Sucessfully', user,'REGISTER_SUCCESSFULLY');
    }

    login = async (req, res) => {
        const { email, password } = req.body;

        const user = await userService.loginUser(email, password);

        const accessExpirySecs = timeStringToSeconds(CONSTANT.ACCESS_TOKEN_EXPIRATION);
        const refreshExpirySecs = timeStringToSeconds(CONSTANT.REFRESH_TOKEN_EXPIRATION);

        const session = await userService.createAuthSession({
            userId: user.id,
            expiresAt: new Date(
                Date.now() + refreshExpirySecs * 1000
            ),
        });

        const accessToken = userService.generateAccessToken({ userId: user.id, email: user.email });
        const refreshToken = userService.generateRefreshToken({ userId: user.id, sessionId: session.id });

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: config.APP_ENV === 'production',
            sameSite: 'lax',
            maxAge: accessExpirySecs * 1000,
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: config.APP_ENV === 'production',
            sameSite: 'lax',
            path: '/api/auth',
            maxAge: refreshExpirySecs * 1000,
        });

        return formatResponse(res, 200, 'Logged in successfully', user,'LOGIN_SUCCESSFULLY');
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

        return formatResponse(res, 200, 'Token refreshed successfully', 'TOKEN_REFRESHED');
    };

    forgotPassword = async (req, res) => {
        const { email } = req.body;
        await authService.forgotPassword(email);
        return formatResponse(res, 200,
            'If an account with that email exists, a password reset link has been sent.',
            null, 'FORGOT_PASSWORD_EMAIL_SENT');
    };
}
export default new AuthController();
