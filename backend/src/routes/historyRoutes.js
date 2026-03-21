import express from 'express';
import { protectRoute } from '../middlewares/authMiddleware.js';
import {
    getSportsHistory,
    getGymSwimmingHistory,
    getPenaltiesHistory
} from '../controllers/historyController.js';

const router = express.Router();

// GET /api/history/sports?facility=&status=&startDate=&endDate=&page=1&limit=5
router.get('/sports', protectRoute, getSportsHistory);

// GET /api/history/gym-swimming?facilityType=&startDate=&endDate=&page=1&limit=5
router.get('/gym-swimming', protectRoute, getGymSwimmingHistory);

// GET /api/history/penalties?type=&isActive=&page=1&limit=5
router.get('/penalties', protectRoute, getPenaltiesHistory);

export default router;
