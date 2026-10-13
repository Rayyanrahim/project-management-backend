import { formatResponse } from '#utils/response.js';
import workspaceService from '#services/workspace.service.js';

class WorkSpaceController {
    createWorkspace = async (req, res) => {
        const workspace = await workspaceService.createWorkspace(req.body, req.user);

        return formatResponse(res, 201, 'Workspace created successfully.', workspace, 'WORKSPACE_CREATED');
    };
}

export default new WorkSpaceController();
