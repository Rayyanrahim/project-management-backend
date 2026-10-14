import companyService from '#services/company.service.js';
import userService from '#services/user.service.js';
import { formatResponse } from '#utils/response.js';

class CompanyController {
    updateCompany = async (req, res) => {
        await companyService.updateCompany(req.params.companyId, req.body, req.user, req.file);
        const userResponse = await userService.getUserResponse(req.user);

        return formatResponse(res, 200, 'Company updated successfully.', userResponse, 'COMPANY_UPDATED');
    };

    removeCompanyLogo = async (req, res) => {
        await companyService.removeCompanyLogo(req.params.companyId, req.user);
        const userResponse = await userService.getUserResponse(req.user);

        return formatResponse(res, 200, 'Company logo removed successfully.', userResponse, 'COMPANY_LOGO_REMOVED');
    };
}

export default new CompanyController();
