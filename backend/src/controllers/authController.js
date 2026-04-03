import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import sendEmail from '../utils/sendEmail.js';

export const registerUser = async (req, res) => {
    try {
        const { name, email, password, confirmPassword, rollNumber, userType } = req.body;

        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        if (!email || !email.endsWith('@iitk.ac.in')) {
            return res.status(400).json({ message: "Invalid domain. Institute email (@iitk.ac.in) required." });
        }

        let finalRollNumber = rollNumber || '';

        if (userType === 'student') {
            if (!rollNumber) {
                return res.status(400).json({ message: "Roll number is required for students" });
            }
        } else if (userType === 'faculty') {
            finalRollNumber = ''; // Faculty don't need roll numbers
        }

        const userExists = await User.findOne({ email });

        if (userExists) {
            if (userExists.isVerified) {
                return res.status(400).json({ message: "User already exists" });
            } else {
                await User.deleteOne({ _id: userExists._id });
            }
        }

        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

        const user = await User.create({
            name,
            email,
            password,
            roles: [userType || 'student'],
            otp: generatedOtp,
            otpExpires: Date.now() + 10 * 60 * 1000,
            profileDetails: { rollNumber: finalRollNumber }
        });

        if (user) {
            const message = `Your account verification code is ${generatedOtp}. Please use this code to activate your P.A.T.A.N.G account.`;

            const html = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"></head>
            <body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
                <tr><td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                    <!-- Header -->
                    <tr>
                      <td style="background:linear-gradient(135deg,#43a047,#66bb6a);padding:30px 40px;text-align:center;">
                        <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.5px;">Welcome to P.A.T.A.N.G 🪁</h1>
                      </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                      <td style="padding:36px 40px 20px;">
                        <p style="margin:0 0 16px;font-size:16px;color:#333;">Hello <strong>${user.name}</strong>,</p>
                        <p style="margin:0 0 16px;font-size:16px;color:#555;line-height:1.6;">Thank you for registering on <strong>P.A.T.A.N.G</strong>. To complete your registration and activate your account, please use the verification code below:</p>
                      </td>
                    </tr>
                    <!-- OTP Box -->
                    <tr>
                      <td align="center" style="padding:0 40px 24px;">
                        <table cellpadding="0" cellspacing="0" style="background:#f0f0f0;border-radius:8px;width:100%;">
                          <tr>
                            <td align="center" style="padding:24px;font-size:36px;font-weight:700;letter-spacing:12px;color:#2e7d32;font-family:'Courier New',monospace;">
                              ${generatedOtp}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <!-- Additional Info -->
                    <tr>
                      <td style="padding:0 40px 36px;">
                        <p style="margin:0 0 12px;font-size:14px;color:#777;line-height:1.5;">This code is valid for a single use. If you did not create an account on P.A.T.A.N.G, you can safely ignore this email.</p>
                        <p style="margin:0;font-size:14px;color:#777;line-height:1.5;">If you have any questions, feel free to reach out to the organizing team.</p>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="background:#fafafa;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
                        <p style="margin:0 0 4px;font-size:12px;color:#e53935;">This is an automated message, please do not reply directly to this email.</p>
                        <p style="margin:0;font-size:12px;color:#999;">© ${new Date().getFullYear()} P.A.T.A.N.G Team — IIT Kanpur</p>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>`;

            await sendEmail({
                email: user.email,
                subject: 'Verify Your P.A.T.A.N.G Account',
                message,
                html
            });

            res.status(201).json({
                _id: user._id,
                email: user.email,
                message: `Activation code sent to ${user.email} successfully`
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
            if (user.otpExpires && user.otpExpires < Date.now()) {
                return res.status(400).json({ message: "OTP has expired. Please request a new one." });
            }

            user.isVerified = true;
            user.otp = undefined;
            user.otpExpires = undefined;
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

        const message = `Your password reset code is ${resetOtp}. It will expire in 10 minutes. If you did not request this, please ignore this email.`;

        const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(135deg,#43a047,#66bb6a);padding:30px 40px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.5px;">Password Reset Verification</h1>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:36px 40px 20px;">
                    <p style="margin:0 0 16px;font-size:16px;color:#333;">Hello,</p>
                    <p style="margin:0 0 16px;font-size:16px;color:#555;line-height:1.6;">You've requested to reset your password for your <strong>P.A.T.A.N.G</strong> account. Please use the following verification code to complete the process:</p>
                  </td>
                </tr>
                <!-- OTP Box -->
                <tr>
                  <td align="center" style="padding:0 40px 24px;">
                    <table cellpadding="0" cellspacing="0" style="background:#f0f0f0;border-radius:8px;width:100%;">
                      <tr>
                        <td align="center" style="padding:24px;font-size:36px;font-weight:700;letter-spacing:12px;color:#2e7d32;font-family:'Courier New',monospace;">
                          ${resetOtp}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Additional Info -->
                <tr>
                  <td style="padding:0 40px 36px;">
                    <p style="margin:0 0 12px;font-size:14px;color:#777;line-height:1.5;">This code is valid for <strong>10 minutes</strong> and can only be used once.</p>
                    <p style="margin:0;font-size:14px;color:#777;line-height:1.5;">If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background:#fafafa;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
                    <p style="margin:0 0 4px;font-size:12px;color:#e53935;">This is an automated message, please do not reply directly to this email.</p>
                    <p style="margin:0;font-size:12px;color:#999;">© ${new Date().getFullYear()} P.A.T.A.N.G Team — IIT Kanpur</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>`;

        await sendEmail({
            email: user.email,
            subject: 'Your Password Reset Code - P.A.T.A.N.G',
            message,
            html
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

export const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "New passwords do not match" });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ message: "New password must contain at least 8 characters" });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!(await user.matchPassword(currentPassword))) {
            return res.status(401).json({ message: "Incorrect current password" });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};