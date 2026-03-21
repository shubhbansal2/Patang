import express from 'express';
import { protectRoute } from '../middlewares/authMiddleware.js';
import { getCalendarPage } from '../controllers/calendarController.js';

const router = express.Router();

// GET /api/calendar?month=2026-03&category=&club=
router.get('/', protectRoute, getCalendarPage);

export default router;
