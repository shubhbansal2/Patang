import express from 'express';
import { protectRoute } from '../middlewares/authMiddleware.js';
import {
    getSettingsPage,
    updateProfile,
    changePassword,
    getProfileCard
} from '../controllers/settingsController.js';

const router = express.Router();

// GET /api/settings — settings page data
router.get('/', protectRoute, getSettingsPage);

// GET /api/settings/profile-card — lightweight avatar dropdown data
router.get('/profile-card', protectRoute, getProfileCard);

// PATCH /api/settings/profile — update profile fields
router.patch('/profile', protectRoute, updateProfile);

// PATCH /api/settings/password — change password
router.patch('/password', protectRoute, changePassword);

export default router;
