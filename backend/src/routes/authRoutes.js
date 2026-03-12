import express from 'express';
import { registerUser, loginUser, verifyOtp } from '../controllers/authController.js';
import { protectRoute, authorizeRoles } from '../middlewares/authMiddleware.js';

const router= express.Router();

router.post('/register', registerUser);
router.post('/verify-otp', verifyOtp);
router.post('/login', loginUser);

router.get('/student-portal', protectRoute, authorizeRoles('student', 'admin'), (req, res) =>{
    res.status(200).json({ message: "Student Portal" });
});

router.get('/executive-dashboard', protectRoute, authorizeRoles('executive', 'admin'), (req, res) =>{
    res.status(200).json({ message: "Executive Dashboard" });
});

router.get('/admin-settings', protectRoute, authorizeRoles('admin'), (req, res) =>{
    res.status(200).json({ message: "Admin Portal" });
});

export default router;