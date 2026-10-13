import express from 'express';
import companyController from '#controller/company.controller.js';
import { protect } from '#middleware/auth.middleware.js';
import { requireActiveCompany } from '#middleware/company.middleware.js';
import { validate } from '#middleware/validator.middleware.js';
import { updateCompanyValidator } from '#validators/company.validator.js';

const router = express.Router();

router.patch('/:companyId', protect, validate(updateCompanyValidator), requireActiveCompany, companyController.updateCompany);

export default router;
