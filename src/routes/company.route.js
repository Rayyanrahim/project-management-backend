import express from 'express';
import companyController from '#controller/company.controller.js';
import { protect } from '#middleware/auth.middleware.js';
import { requireActiveCompany } from '#middleware/company.middleware.js';
import upload from '#middleware/upload.middleware.js';
import { validate } from '#middleware/validator.middleware.js';
import { removeCompanyLogoValidator, updateCompanyValidator } from '#validators/company.validator.js';

const router = express.Router();

router.patch('/:companyId', protect, upload.single('logo'), validate(updateCompanyValidator), requireActiveCompany, companyController.updateCompany);
router.delete('/:companyId/logo', protect, validate(removeCompanyLogoValidator), requireActiveCompany, companyController.removeCompanyLogo);

export default router;
