import { Router } from 'express';
import { organizationController } from '../controllers/organization.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { createOrganizationSchema, updateOrganizationSchema } from '../utils/organization.validation';
import { createOrgAdminSchema } from '../utils/validation';

const router = Router();

/**
 * @route   POST /api/v1/organizations
 * @desc    Create new organization
 * @access  Private (SUPER_ADMIN only)
 */
router.post(
  '/',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate(createOrganizationSchema),
  organizationController.create.bind(organizationController)
);

// All routes below require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/organizations
 * @desc    Get all organizations
 * @access  Private (SUPER_ADMIN only)
 */
router.get(
  '/',
  authorize('SUPER_ADMIN'),
  organizationController.getAll.bind(organizationController)
);

/**
 * @route   GET /api/v1/organizations/:id
 * @desc    Get organization by ID
 * @access  Private (All authenticated users - including HRMS_ADMIN for org management)
 */
router.get(
  '/:id',
  organizationController.getById.bind(organizationController)
);

/**
 * @route   PUT /api/v1/organizations/:id
 * @desc    Update organization
 * @access  Private (SUPER_ADMIN, ORG_ADMIN)
 */
router.put(
  '/:id',
  authorize('SUPER_ADMIN', 'ORG_ADMIN'),
  validate(updateOrganizationSchema),
  organizationController.update.bind(organizationController)
);

/**
 * @route   POST /api/v1/organizations/:id/logo
 * @desc    Update organization logo
 * @access  Private (SUPER_ADMIN, ORG_ADMIN)
 */
router.post(
  '/:id/logo',
  authorize('SUPER_ADMIN', 'ORG_ADMIN'),
  organizationController.updateLogo.bind(organizationController)
);

/**
 * @route   POST /api/v1/organizations/:id/admins
 * @desc    Create organization admin user
 * @access  Private (SUPER_ADMIN only)
 */
router.post(
  '/:id/admins',
  authorize('SUPER_ADMIN'),
  validate(createOrgAdminSchema),
  organizationController.createAdmin.bind(organizationController)
);

/**
 * @route   GET /api/v1/organizations/:id/statistics
 * @desc    Get organization statistics
 * @access  Private (SUPER_ADMIN, ORG_ADMIN, HR_MANAGER)
 */
router.get(
  '/:id/statistics',
  authorize('SUPER_ADMIN', 'ORG_ADMIN', 'HR_MANAGER'),
  organizationController.getStatistics.bind(organizationController)
);

export default router;
