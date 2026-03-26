import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import sendEmail from '../utils/sendEmail.js';

export const registerUser = async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        if (!email.endsWith('@iitk.ac.in')) {
            return res.status(400).json({ message: "Invalid domain. Institute email required." });
        }

        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

        const user = await User.create({
            name,
            email,
            password,
            otp: generatedOtp
        });

        if (user) {
            const message = `Your activation code is ${generatedOtp}.`;
            
            await sendEmail({
                email: user.email,
                subject: 'Verify your account',
                message: message
            });

            res.status(201).json({
                _id: user._id,
                email: user.email,
                message: "Activation code sent successfully"
            });
        } else {
            res.status(400).json({ message: "Invalid user data" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email });

        if (user && user.otp === otp) {
            user.isVerified = true;
            user.otp = undefined;
            await user.save();

            res.status(200).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                roles: user.roles,
                captainOf: user.captainOf,
                token: generateToken(user._id, user.roles)
            });
        } else {
            res.status(401).json({ message: "Invalid activation code" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            if (!user.isVerified) {
                return res.status(401).json({ message: "Account is not verified" });
            }
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                roles: user.roles,
                captainOf: user.captainOf,
                token: generateToken(user._id, user.roles)
            });
        } else {
            res.status(401).json({ message: "Invalid email or password" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
        
        user.resetPasswordOtp = resetOtp;
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
        await user.save();

        const message = `Your password reset code is ${resetOtp}. It will expire in 10 minutes.`;
        
        await sendEmail({
            email: user.email,
            subject: 'Password Reset Request',
            message: message
        });

        res.status(200).json({ message: "Password reset code sent successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword, confirmPassword } = req.body;

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        const user = await User.findOne({
            email,
            resetPasswordOtp: otp,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired reset code" });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ message: "New password must contain at least 8 characters" });
        }

        user.password = newPassword;
        user.resetPasswordOtp = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const logoutUser = async (req, res) => {
    try {
        // Since we use JWTs (stateless), logout is mostly a frontend responsibility (delete token).
        // But if cookies were used, we clear them here just in case.
        res.cookie('jwt', '', {
            httpOnly: true,
            expires: new Date(0)
        });

        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};