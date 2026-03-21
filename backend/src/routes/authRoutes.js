import express from 'express';
import { 
    registerUser, 
    verifyOtp, 
    loginUser, 
    forgotPassword, 
    resetPassword,
    logoutUser
} from '../controllers/authController.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/verify-otp', verifyOtp);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;