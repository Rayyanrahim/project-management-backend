import { formatResponse } from '#utils/response.js';
import userService from '#services/user.service.js';

class UserController {
    me = async (req, res) => {
        const user = await userService.getUserResponse(req.user);
        return formatResponse(res, 200, 'Current user retrieved successfully.', user, 'CURRENT_USER_RETRIEVED');
    };
}

export default new UserController();
