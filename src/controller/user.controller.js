import { formatResponse } from '#utils/response.js';

class UserController {
    me = async (req, res) => {
        return formatResponse(res, 200, 'Current user retrieved successfully.', req.user, 'CURRENT_USER_RETRIEVED');
    };
}

export default new UserController();
