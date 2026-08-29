import { formatResponse } from '#utils/response.js'
import timeStringToSeconds from '#utils/timeUtils.js'
import * as CONSTANT from '../constant/constant.js'
import userService from '#services/user.service.js'

class AuthController {
    login = async (req, res) => {
        const { email, password } = req.body;
        const user = await userService.loginUser(email, password);

        const accessToken = userService.generateAccessToken({
            userId: user.id,
            email: user.email,
        });

        const refreshToken = await userService.generateRefreshToken({
            userId: user.id,
        });

        const refreshExpirySecs = timeStringToSeconds(
            CONSTANT.REFRESH_TOKEN_EXPIRATION
        );

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true, 
            sameSite: 'none',
            maxAge: refreshExpirySecs * 1000, 
        });

        const accessExpirySecs = timeStringToSeconds(
            CONSTANT.ACCESS_TOKEN_EXPIRATION
        );
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: true, 
            sameSite: 'none',
            maxAge: accessExpirySecs * 1000, 
        });

        return formatResponse(res, 200, 'Login in sucessfully', 'LOGIN_SUCESSFULLY');
    }
}
export default new AuthController();
