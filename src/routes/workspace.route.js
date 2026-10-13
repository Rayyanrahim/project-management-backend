import express from 'express'
import { validate } from '#middleware/validator.middleware.js'
import { protect } from '#middleware/auth.middleware.js'
import workspaceController from '#controller/workspace.controller.js'
import { createWorkspaceValidator } from '#validators/workspace.validator.js'
const router = express.Router()


router.post('/', protect, validate(createWorkspaceValidator), workspaceController.createWorkspace);

export default router;
