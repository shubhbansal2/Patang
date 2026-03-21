import express from 'express';
import { protectRoute } from '../middlewares/authMiddleware.js';
import {
    getSportsBookingPage,
    getGymRegistrationPage,
    getSwimmingRegistrationPage
} from '../controllers/slotBookingController.js';

const router = express.Router();

// GET /api/slot-booking/sports?sportType=Badminton&date=2026-03-21
router.get('/sports', protectRoute, getSportsBookingPage);

// GET /api/slot-booking/gym
router.get('/gym', protectRoute, getGymRegistrationPage);

// GET /api/slot-booking/swimming
router.get('/swimming', protectRoute, getSwimmingRegistrationPage);

export default router;
