import companyService from '#services/company.service.js';
import userService from '#services/user.service.js';
import { formatResponse } from '#utils/response.js';

class CompanyController {
    updateCompany = async (req, res) => {
        await companyService.updateCompany(req.params.companyId, req.body, req.user);
        const userResponse = await userService.getUserResponse(req.user);

        return formatResponse(res, 200, 'Company updated successfully.', userResponse, 'COMPANY_UPDATED');
    };
}

export default new CompanyController();
